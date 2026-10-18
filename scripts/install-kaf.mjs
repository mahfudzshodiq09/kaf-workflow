#!/usr/bin/env node
/**
 * KAF (Knowledge-driven Agentic Framework) Installer & Exporter
 *
 * Cara pakai:
 * 1. Pasang KAF dari repo ini ke proyek lain (misal PMB):
 *    node scripts/install-kaf.mjs /path/ke/proyek-pmb
 *
 * 2. Jika repo KAF di-clone ke dalam proyek baru, pasang ke direktori saat ini:
 *    node kaf/scripts/install-kaf.mjs .
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourceRoot = path.resolve(__dirname, "..");

const targetArg = process.argv[2] || ".";
const targetRoot = path.resolve(process.cwd(), targetArg);

const ITEMS_TO_COPY = [
  ".agents/skills/kaf-1-discovery",
  ".agents/skills/kaf-2-spec",
  ".agents/skills/kaf-3-coding",
  ".agents/skills/kaf-4-review",
  ".agents/skills/kaf-6-memory",
  ".agents/skills/kaf-status",
  "scripts/9router.mjs",
  "scripts/kaf-code.mjs",
  "scripts/kaf-check.mjs",
  "scripts/kaf-status.mjs",
  "scripts/install-kaf.mjs",
  "docs/UI/design_system.md",
  "AGENTS.md",
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  if (sourceRoot === targetRoot) {
    console.log("Usage: node scripts/install-kaf.mjs <path-ke-proyek-tujuan>");
    console.log("Contoh: node scripts/install-kaf.mjs ../pmb-univet");
    return;
  }

  console.log(`[KAF Installer] Memasang KAF Workflow ke: ${targetRoot}`);
  for (const rel of ITEMS_TO_COPY) {
    const src = path.join(sourceRoot, rel);
    const dest = path.join(targetRoot, rel);
    if (fs.existsSync(src)) {
      copyRecursive(src, dest);
      console.log(`  + Terpasang: ${rel}`);
    }
  }

  fs.mkdirSync(path.join(targetRoot, "docs", "discovery"), { recursive: true });
  fs.mkdirSync(path.join(targetRoot, "docs", "specs"), { recursive: true });

  console.log("\n[KAF Installer] SELESAI! Command yang siap digunakan di proyek tujuan:");
  console.log("  /kaf-1-discovery <slug>");
  console.log("  /kaf-2-spec <slug>");
  console.log("  /kaf-3-coding <slug>");
  console.log("  /kaf-4-review <slug>");
  console.log("  /kaf-6-memory <slug>");
  console.log("  /kaf-status");
}

main();
