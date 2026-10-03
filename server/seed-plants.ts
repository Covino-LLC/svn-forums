import fs from "fs";
import path from "path";

export interface SeedPlant {
  number: number;
  title: string;
  biome: "plot" | "grove" | "forest" | "biosphere";
  content: string;
}

const SEED_FILES = ["README.md", "plants-11-20.md"];

function toBiome(label: string): SeedPlant["biome"] {
  const l = label.toLowerCase();
  if (l.includes("biosphere")) return "biosphere";
  if (l.includes("forest")) return "forest";
  if (l.includes("grove")) return "grove";
  return "plot";
}

/**
 * Parse the research-backed seed plants from docs/seed-plants/*.md.
 * Each plant starts with "## PLANT N — <Biome>" followed by "### <Title>",
 * and its body runs until the next "---" separator or "## " heading.
 */
export function loadSeedPlants(dir = path.resolve(process.cwd(), "docs/seed-plants")): SeedPlant[] {
  const plants: SeedPlant[] = [];

  for (const file of SEED_FILES) {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, "utf8").split("\n");

    for (let i = 0; i < lines.length; i++) {
      const head = lines[i].match(/^## PLANT (\d+)\s*[—-]\s*(.+)$/);
      if (!head) continue;

      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith("### ")) j++;
      const title = (lines[j] || "").replace(/^###\s*/, "").trim();

      const body: string[] = [];
      for (j = j + 1; j < lines.length; j++) {
        if (lines[j].trim() === "---" || lines[j].startsWith("## ")) break;
        body.push(lines[j]);
      }

      const content = body.join("\n").trim();
      if (title && content) {
        plants.push({ number: Number(head[1]), title, biome: toBiome(head[2]), content });
      }
      i = j - 1;
    }
  }

  return plants.sort((a, b) => a.number - b.number);
}
