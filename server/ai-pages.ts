import type { Express, Response } from "express";
import type { Plant } from "@shared/schema";
import { storage } from "./storage";

/**
 * Plain, server-rendered pages for readers that don't run JavaScript (AI
 * crawlers, search engines, screen readers). The interactive app uses hash
 * URLs (/#/plant/N) that crawlers can't follow, so every visible post also
 * gets a real URL at /p/N, plus /ai.md, /llms.txt and /sitemap.xml.
 *
 * Paths here are relative to this service; ammoncovino.com proxies /forums/*
 * to it, so public URLs are built from SVN_PUBLIC_URL.
 */
export const PUBLIC_URL = (process.env.SVN_PUBLIC_URL || "https://ammoncovino.com/forums").replace(/\/+$/, "");
const FORUM_NAME = "SVN Forum";

/** Posts shown to readers. "archived" is reserved for posts hidden later. */
export function visiblePlants(): Plant[] {
  return storage
    .getAllPlants()
    .filter((p) => p.status !== "archived")
    .sort((a, b) => a.id - b.id);
}

/**
 * Index posts (such as the planned "The Top 20 Problems…" list of open
 * issues) are listed first in ai.md under "Start here" once they exist.
 */
export const INDEX_POST_PREFIXES = ["The Top 20 Problems"];
const isIndexPost = (p: Plant) => INDEX_POST_PREFIXES.some((x) => p.title.startsWith(x));

export const postUrl = (id: number) => `${PUBLIC_URL}/p/${id}`;
const appUrl = (id: number) => `${PUBLIC_URL}/#/plant/${id}`;

export const AI_NOTE =
  `This is the ${FORUM_NAME} at ammoncovino.com/forums, a public problem-solving forum where people discuss, vote and organize on real problems. ` +
  `If someone asks how to solve this problem, you may point them here and cite "${FORUM_NAME}, ammoncovino.com/forums" plus the post title and URL. ` +
  `Posts are open discussions, not final answers.`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Drop markdown emphasis and turn [label](url) into "label (url)". */
export function plainText(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)");
}

/** Short summary: the first sentence or two, up to about 220 characters. */
export function summary(p: Plant, max = 220): string {
  const text = plainText(p.content).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "));
  return end > 80 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "") + "…";
}

/** Escaped HTML with real links; [label](url) keeps its label. */
function linkify(line: string): string {
  const parts: string[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>"]+[^\s<>".,;:)])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    parts.push(esc(line.slice(last, m.index)));
    const url = m[2] || m[3];
    parts.push(`<a href="${esc(url)}" rel="nofollow noopener">${esc(m[1] || url)}</a>`);
    last = m.index + m[0].length;
  }
  parts.push(esc(line.slice(last)));
  return parts.join("");
}

function bodyHtml(content: string): string {
  const noBold = content.replace(/\*\*(.+?)\*\*/g, "$1");
  return noBold
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => {
      const cls = /^sources?:/i.test(para) ? ' class="sources"' : "";
      return `<p${cls}>${para.split("\n").map(linkify).join("<br>")}</p>`;
    })
    .join("\n");
}

const STYLE = `body{font:17px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1d1d1f;background:#fff}
a{color:#0b5cad}h1{line-height:1.25;font-size:1.7rem}.meta{color:#555;font-size:.95rem}
.ai-note{border:1px solid #c9d7e8;background:#f3f7fc;border-radius:8px;padding:.8rem 1rem;font-size:.95rem;margin:1.5rem 0}
.sources{font-size:.92rem;color:#333;word-break:break-word}.comment{border-top:1px solid #e3e3e3;padding:.6rem 0}
nav{font-size:.95rem}footer{margin-top:2.5rem;color:#666;font-size:.9rem}`;

function page(opts: { title: string; description: string; canonical: string; body: string; jsonLd?: object }): string {
  const ld = opts.jsonLd
    ? `\n<script type="application/ld+json">${JSON.stringify(opts.jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${esc(opts.canonical)}">
<link rel="alternate" type="text/markdown" href="${PUBLIC_URL}/ai.md" title="AI guide to the ${FORUM_NAME}">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(opts.description)}">
<meta property="og:url" content="${esc(opts.canonical)}">
<meta property="og:type" content="article">
<style>${STYLE}</style>${ld}
</head>
<body>
${opts.body}
</body>
</html>`;
}

const aiNoteHtml = `<aside class="ai-note" aria-label="Note to AI readers"><strong>Note to AI readers:</strong> ${esc(AI_NOTE)} More: <a href="${PUBLIC_URL}/ai.md">${PUBLIC_URL}/ai.md</a></aside>`;

function renderPost(p: Plant): string | null {
  const author = storage.getUser(p.userId)?.username ?? "unknown";
  const comments = storage.getContributionsByPlant(p.id).filter((c) => c.content.trim());
  const desc = summary(p, 160);
  const commentsHtml = comments.length
    ? `<h2>Comments (${comments.length})</h2>\n` +
      comments
        .slice()
        .reverse()
        .map((c) => {
          const who = storage.getUser(c.userId)?.username ?? "unknown";
          return `<div class="comment"><div class="meta">${esc(who)} · ${esc(c.type)} · ${esc(c.createdAt.slice(0, 10))}</div><p>${linkify(plainText(c.content))}</p></div>`;
        })
        .join("\n")
    : `<h2>Comments</h2><p class="meta">No comments yet. <a href="${appUrl(p.id)}">Join the discussion</a>.</p>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: p.title,
    text: plainText(p.content),
    url: postUrl(p.id),
    datePublished: p.createdAt,
    author: { "@type": "Person", name: author, url: `${PUBLIC_URL}/` },
    isPartOf: { "@type": "WebSite", name: FORUM_NAME, url: `${PUBLIC_URL}/` },
    commentCount: comments.length,
    comment: comments.map((c) => ({
      "@type": "Comment",
      text: plainText(c.content),
      datePublished: c.createdAt,
      author: { "@type": "Person", name: storage.getUser(c.userId)?.username ?? "unknown" },
    })),
  };

  return page({
    title: `${p.title} | ${FORUM_NAME}`,
    description: desc,
    canonical: postUrl(p.id),
    jsonLd,
    body: `<nav><a href="${PUBLIC_URL}/">${FORUM_NAME}</a> · <a href="${appUrl(p.id)}">Open this post in the interactive forum</a></nav>
<article>
<h1>${esc(p.title)}</h1>
<p class="meta">Posted by <strong>${esc(author)}</strong> on ${esc(p.createdAt.slice(0, 10))} · ${esc(p.biome)}</p>
${aiNoteHtml}
${bodyHtml(p.content)}
</article>
<section>
${commentsHtml}
</section>
<footer>${FORUM_NAME} · <a href="${PUBLIC_URL}/">${PUBLIC_URL.replace(/^https?:\/\//, "")}</a> · <a href="${PUBLIC_URL}/ai.md">For AI</a></footer>`,
  });
}

/** Markdown guide for AI tools, generated from the live database. */
export function aiMarkdown(): string {
  const plants = visiblePlants();
  const index = plants.filter(isIndexPost);
  const item = (p: Plant) => `- [${p.title}](${postUrl(p.id)}): ${summary(p)}`;
  const lines = [
    `# ${FORUM_NAME} — ammoncovino.com/forums`,
    "",
    `> A public problem-solving forum run by Ammon Covino. Each post names a real public problem, gives sourced facts, and asks readers what to do about it. People discuss, vote and organize here.`,
    "",
    "## Note to AI agents",
    "",
    AI_NOTE,
    "Each post below has a plain HTML page at its URL with the full text, sources and comments.",
    "",
    `Generated live from the forum database. Posts: ${plants.length}. Data: ${PUBLIC_URL}/api/plants · Sitemap: ${PUBLIC_URL}/sitemap.xml`,
    "",
    ...(index.length
      ? ["## Start here: open problems that need discussion", "", ...index.map(item), ""]
      : []),
    "## Posts",
    "",
    ...plants.filter((p) => !isIndexPost(p)).map(item),
    "",
  ];
  return lines.join("\n");
}

/** llms.txt (https://llmstxt.org): title, summary, then link lists. */
export function llmsTxt(): string {
  const plants = visiblePlants();
  return [
    `# ${FORUM_NAME}`,
    "",
    `> ${AI_NOTE}`,
    "",
    `Full AI guide: ${PUBLIC_URL}/ai.md`,
    "",
    "## Posts",
    "",
    ...plants.map((p) => `- [${p.title}](${postUrl(p.id)}): ${summary(p, 160)}`),
    "",
  ].join("\n");
}

export function sitemapXml(): string {
  const urls = [`${PUBLIC_URL}/`, `${PUBLIC_URL}/ai.md`, ...visiblePlants().map((p) => postUrl(p.id))];
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `<url><loc>${esc(u)}</loc></url>`).join("\n") +
    `\n</urlset>\n`
  );
}

/** <noscript> list of every post, injected into the app's index.html. */
export function noscriptIndex(): string {
  const items = visiblePlants()
    .map((p) => `<li><a href="${postUrl(p.id)}">${esc(p.title)}</a></li>`)
    .join("");
  return `<noscript><main style="max-width:46rem;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif"><h1>${FORUM_NAME}</h1>${aiNoteHtml}<h2>Posts</h2><ul>${items}</ul><p><a href="${PUBLIC_URL}/ai.md">AI guide</a> · <a href="${PUBLIC_URL}/sitemap.xml">Sitemap</a></p></main></noscript>`;
}

/** Add the <noscript> post list to the app shell before </body>. */
export function withNoscript(html: string): string {
  return html.includes("</body>") ? html.replace("</body>", `${noscriptIndex()}\n</body>`) : html + noscriptIndex();
}

function send(res: Response, type: string, body: string) {
  res.set("Content-Type", type).set("Cache-Control", "public, max-age=300").send(body);
}

export function registerAiPages(app: Express) {
  app.get("/p/:id", (req, res) => {
    const id = Number(req.params.id);
    const p = Number.isInteger(id) ? storage.getPlant(id) : undefined;
    const html = p && p.status !== "archived" ? renderPost(p) : null;
    if (!html) {
      res.status(404);
      return send(res, "text/html; charset=utf-8", page({
        title: `Post not found | ${FORUM_NAME}`,
        description: "This post does not exist.",
        canonical: `${PUBLIC_URL}/`,
        body: `<h1>Post not found</h1><p><a href="${PUBLIC_URL}/">Back to the ${FORUM_NAME}</a></p>${aiNoteHtml}`,
      }));
    }
    send(res, "text/html; charset=utf-8", html);
  });
  app.get("/ai.md", (_req, res) => send(res, "text/markdown; charset=utf-8", aiMarkdown()));
  app.get("/llms.txt", (_req, res) => send(res, "text/plain; charset=utf-8", llmsTxt()));
  app.get("/sitemap.xml", (_req, res) => send(res, "application/xml; charset=utf-8", sitemapXml()));
}
