import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import { createServer, type Server } from "http";
import type { AddressInfo } from "node:net";

// storage opens SVN_DB_PATH at import time, so the temp db is set before imports run.
vi.hoisted(() => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  process.env.SVN_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "svn-")), "svn.db");
  delete process.env.SVN_READ_ONLY;
});

import { registerRoutes } from "../routes";
import { storage } from "../storage";

let server: Server;
let base: string;

async function call(method: string, url: string, body?: unknown, cookie?: string) {
  const res = await fetch(base + url, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: res.status,
    json: await res.json().catch(() => null),
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}

const plant = { title: "T", content: "Because 40% of 100 is 40. Therefore it follows.", biome: "plot" };

beforeAll(async () => {
  storage.createUser({ username: "steward", email: "s@x.org", tier: 1, energy: 2, createdAt: "now" });
  const app = express();
  app.use(express.json());
  server = createServer(app);
  await registerRoutes(server, app);
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

describe("accounts", () => {
  it("rejects anonymous writes and bad signups", async () => {
    expect((await call("POST", "/api/plants", { userId: 1, ...plant })).status).toBe(401);
    expect((await call("POST", "/api/contributions", { userId: 1, plantId: 1, content: "x", type: "join" })).status).toBe(401);
    expect((await call("POST", "/api/auth/signup", { username: "a", email: "x", password: "short" })).status).toBe(400);
  });

  it("posts as the logged-in user, ignoring a userId in the body", async () => {
    const signup = await call("POST", "/api/auth/signup", { username: "ann", email: "ann@x.org", password: "longenough1" });
    expect(signup.status).toBe(200);
    expect((await call("POST", "/api/auth/signup", { username: "bob", email: "ANN@x.org", password: "longenough1" })).status).toBe(409);

    const res = await call("POST", "/api/plants", { userId: 1, ...plant }, signup.cookie);
    expect(res.status).toBe(200);
    expect(res.json.userId).toBe(signup.json.id);
    expect(res.json.userId).not.toBe(1);
  });

  it("rejects a tampered or foreign session cookie", async () => {
    const login = await call("POST", "/api/auth/login", { username: "ann", password: "longenough1" });
    const [name, value] = login.cookie!.split("=");
    const forged = `${name}=1.${value.split(".").slice(1).join(".")}`;
    expect((await call("POST", "/api/plants", plant, forged)).status).toBe(401);
  });

  it("login fails the same way for unknown user, wrong password and a seeded passwordless account", async () => {
    for (const body of [
      { username: "nobody", password: "longenough1" },
      { username: "ann", password: "wrongwrong" },
      { username: "steward", password: "" },
    ]) {
      const r = await call("POST", "/api/auth/login", body);
      expect(r.status).toBe(401);
      expect(r.json.message).toBe("Wrong username or password.");
    }
  });

  it("never exposes email or password hash to other visitors", async () => {
    const users = JSON.stringify((await call("GET", "/api/users")).json);
    expect(users).not.toMatch(/email|passwordHash|ann@x\.org/);
  });
});
