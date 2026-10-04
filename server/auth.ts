import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// ===== Passwords: scrypt, no extra dependency =====
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// ===== Sessions: HMAC-signed cookie `svn_session=<userId>.<expiryMs>.<sig>` =====
// The signing key lives on the data volume next to the database, so sessions survive
// redeploys and no new environment variable is needed.
const keyPath = path.join(path.dirname(process.env.SVN_DB_PATH || "svn.db"), "session.key");
function loadKey(): Buffer {
  try {
    return Buffer.from(fs.readFileSync(keyPath, "utf8").trim(), "hex");
  } catch {
    const key = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, key.toString("hex"), { mode: 0o600 });
    return key;
  }
}
const key = loadKey();

const COOKIE = "svn_session";
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;
const cookiePath = process.env.SVN_BASE_PATH
  ? `/${process.env.SVN_BASE_PATH.replace(/^\/+|\/+$/g, "")}`
  : "/";

function sign(payload: string): string {
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}

export function setSession(res: Response, userId: number) {
  const payload = `${userId}.${Date.now() + MAX_AGE_MS}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${payload}.${sign(payload)}; Path=${cookiePath}; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_MS / 1000}${secure}`,
  );
}

export function clearSession(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=${cookiePath}; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function sessionUser(req: Request): User | undefined {
  const raw = /(?:^|;\s*)svn_session=([^;]+)/.exec(req.headers.cookie || "")?.[1];
  const [id, exp, sig] = (raw || "").split(".");
  if (!id || !exp || !sig || Number(exp) < Date.now()) return undefined;
  const expected = Buffer.from(sign(`${id}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return undefined;
  return storage.getUser(Number(id));
}

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ message: "Log in to do that." });
  req.user = user;
  next();
}

// ===== Never expose email or password hash to other users =====
export function publicUser(u: User) {
  const { email: _email, passwordHash: _hash, ...rest } = u;
  return rest;
}

// ===== Rate limiting: in-memory fixed window; resets on restart (single instance) =====
export function rateLimit(max: number, windowMs: number, keyOf: (req: Request) => string) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const k = keyOf(req);
    const h = hits.get(k);
    if (!h || h.reset < now) {
      hits.set(k, { n: 1, reset: now + windowMs });
      if (hits.size > 10000) hits.forEach((v, kk) => { if (v.reset < now) hits.delete(kk); });
      return next();
    }
    if (++h.n > max) {
      res.setHeader("Retry-After", Math.ceil((h.reset - now) / 1000));
      return res.status(429).json({ message: "Too many attempts. Try again later." });
    }
    next();
  };
}

// The site proxy forwards the visitor address; direct hits fall back to the socket.
export const clientIp = (req: Request) =>
  String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?")
    .split(",")[0]
    .trim();
