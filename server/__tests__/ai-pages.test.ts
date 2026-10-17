import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import { createServer, type Server } from "http";
import type { AddressInfo } from "node:net";

vi.hoisted(() => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  process.env.SVN_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "svn-ai-")), "svn.db");
  delete process.env.SVN_READ_ONLY;
});

import { registerRoutes } from "../routes";
import { storage } from "../storage";
import { plainText, withNoscript } from "../ai-pages";

let server: Server;
let base: string;
let postId: number;
let hiddenId: number;

const get = async (url: string) => {
  const res = await fetch(base + url, { headers: { "user-agent": "GPTBot/1.1" } });
  return { status: res.status, type: res.headers.get("content-type") || "", text: await res.text() };
};

beforeAll(async () => {
  const u = storage.createUser({ username: "ammoncovino", email: "a@x.org", tier: 1, energy: 2, createdAt: "2026-10-13T00:00:00Z" });
  postId = storage.createPlant({
    userId: u.id, title: "Is <AI> taking jobs?", biome: "biosphere", energy: 0, aiScore: "{}", status: "growing",
    createdAt: "2026-10-13T00:00:00Z",
    content: "**Measured:** young workers lost ground.\n\nWhat should we do?\n\n**Sources:** [Stanford](https://siepr.stanford.edu/x), https://www.nber.org/papers/w32719",
  }).id;
  hiddenId = storage.createPlant({
    userId: u.id, title: "Hidden post", biome: "plot", energy: 0, aiScore: "{}", status: "archived",
    createdAt: "2026-10-13T00:00:00Z", content: "Gone for now.",
  }).id;
  storage.createContribution({ plantId: postId, userId: u.id, content: "Wage insurance first.", type: "expand", energyTransferred: 0, createdAt: "2026-10-14T00:00:00Z" });
  const app = express();
  app.use(express.json());
  server = createServer(app);
  await registerRoutes(server, app);
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

describe("AI-readable pages", () => {
  it("renders a post as plain HTML with title, author, links, comments, AI note and JSON-LD", async () => {
    const r = await get(`/p/${postId}`);
    expect(r.status).toBe(200);
    expect(r.type).toContain("text/html");
    expect(r.text).toContain("<title>Is &lt;AI&gt; taking jobs? | SVN Forum</title>");
    expect(r.text).toContain('<meta name="description" content="Measured: young workers lost ground.');
    expect(r.text).toContain("Posted by <strong>ammoncovino</strong>");
    expect(r.text).not.toContain("**");
    expect(r.text).toContain('<a href="https://siepr.stanford.edu/x" rel="nofollow noopener">Stanford</a>');
    expect(r.text).toContain('<a href="https://www.nber.org/papers/w32719"');
    expect(r.text).toContain("Wage insurance first.");
    expect(r.text).toContain("Note to AI readers:");
    expect(r.text).toContain("cite &quot;SVN Forum, ammoncovino.com/forums&quot;");
    expect(r.text).toContain('"@type":"DiscussionForumPosting"');
    expect(r.text).toContain(`https://ammoncovino.com/forums/#/plant/${postId}`);
  });

  it("404s for missing and hidden posts", async () => {
    expect((await get("/p/99999")).status).toBe(404);
    expect((await get(`/p/${hiddenId}`)).status).toBe(404);
    expect((await get("/p/abc")).status).toBe(404);
  });

  it("serves ai.md, llms.txt and sitemap.xml from the database, without hidden posts", async () => {
    const md = await get("/ai.md");
    expect(md.type).toContain("text/markdown");
    expect(md.text).toContain("## Note to AI agents");
    expect(md.text).toContain(`(https://ammoncovino.com/forums/p/${postId}): Measured: young workers lost ground.`);
    expect(md.text).not.toContain("Hidden post");

    const llms = await get("/llms.txt");
    expect(llms.text.startsWith("# SVN Forum")).toBe(true);
    expect(llms.text).toContain(`https://ammoncovino.com/forums/p/${postId}`);

    const sm = await get("/sitemap.xml");
    expect(sm.type).toContain("application/xml");
    expect(sm.text).toContain(`<loc>https://ammoncovino.com/forums/p/${postId}</loc>`);
    expect(sm.text).not.toContain(`/p/${hiddenId}<`);
  });

  it("lists a Top 20 index post under Start here", async () => {
    const u = storage.getUserByUsername("ammoncovino")!;
    const top = storage.createPlant({ userId: u.id, title: "The Top 20 Problems People Are Circling", biome: "biosphere", energy: 0, aiScore: "{}", status: "growing", createdAt: "2026-10-17T00:00:00Z", content: "Pick one." });
    const md = (await get("/ai.md")).text;
    const start = md.indexOf("## Start here");
    expect(start).toBeGreaterThan(-1);
    expect(md.indexOf(`/p/${top.id}`)).toBeGreaterThan(start);
    expect(md.indexOf(`/p/${top.id}`)).toBeLessThan(md.indexOf("## Posts"));
    storage.updatePlantStatus(top.id, "archived");
  });

  it("adds a noscript post list to the app shell", () => {
    const html = withNoscript("<html><body><div id=\"root\"></div></body></html>");
    expect(html).toContain(`<noscript>`);
    expect(html).toContain(`href="https://ammoncovino.com/forums/p/${postId}">Is &lt;AI&gt; taking jobs?</a>`);
    expect(html).not.toContain("Hidden post");
  });

  it("strips markdown emphasis", () => {
    expect(plainText("**Bold** and *it* [x](https://a.b)")).toBe("Bold and it x (https://a.b)");
  });
});
