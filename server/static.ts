import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { withNoscript } from "./ai-pages";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // The app shell gets a <noscript> list of every post so readers that
  // don't run JavaScript can still find them.
  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf8");
  const sendIndex = (_req: express.Request, res: express.Response) => {
    res.set("Content-Type", "text/html; charset=utf-8").send(withNoscript(indexHtml));
  };
  app.get(["/", "/index.html"], sendIndex);

  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", sendIndex);
}
