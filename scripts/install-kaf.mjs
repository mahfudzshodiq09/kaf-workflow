#!/usr/bin/env node
/**
 * KAF (Knowledge-driven Agentic Framework) Installer — versi general.
 *
 * Cara pakai:
 *   node scripts/install-kaf.mjs <path-proyek-tujuan>
 *   (atau dari clone sementara: node .kaf-tmp/scripts/install-kaf.mjs .)
 *
 * - File kit (skills & scripts) selalu disalin/diperbarui.
 * - File milik proyek (kaf.config.json, design system, AGENTS.md) TIDAK pernah ditimpa:
 *   hanya dibuat bila belum ada. AGENTS.md lama yang bukan milik KAF dibiarkan; aturan KAF
 *   ditulis ke AGENTS.kaf.md untuk digabung manual.
 * - .gitignore dilengkapi entri file sementara KAF.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(__dirname, "..");
const targetRoot = path.resolve(process.cwd(), process.argv[2] || ".");

const KIT_FILES = [
  ".agents/skills/kaf-1-discovery",
  ".agents/skills/kaf-2-spec",
  ".agents/skills/kaf-3-coding",
  ".agents/skills/kaf-4-review",
  ".agents/skills/kaf-6-memory",
  ".agents/skills/kaf-status",
  "scripts/9router.mjs",
  "scripts/kaf-code.mjs",
  "scripts/kaf-check.mjs",
  "scripts/kaf-config.mjs",
  "scripts/kaf-status.mjs",
  "scripts/install-kaf.mjs",
];

const PROJECT_FILES = ["kaf.config.json", "docs/UI/design_system.md"];

const GITIGNORE_ENTRIES = [".env", "docs/discovery/.context-*.txt", "docs/specs/.bundle-*.txt", "prisma/modules/"];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) copyRecursive(path.join(src, entry), path.join(dest, entry));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  if (sourceRoot === targetRoot) {
    console.log("Usage: node scripts/install-kaf.mjs <path-ke-proyek-tujuan>");
    return;
  }
  console.log(`[KAF Installer] Memasang KAF Workflow (general) ke: ${targetRoot}`);

  for (const rel of KIT_FILES) {
    copyRecursive(path.join(sourceRoot, rel), path.join(targetRoot, rel));
    console.log(`  + kit       : ${rel}`);
  }

  for (const rel of PROJECT_FILES) {
    const dest = path.join(targetRoot, rel);
    if (fs.existsSync(dest)) {
      console.log(`  = dipertahankan (milik proyek): ${rel}`);
    } else {
      copyRecursive(path.join(sourceRoot, rel), dest);
      console.log(`  + template  : ${rel}  ← isi sesuai proyekmu`);
    }
  }

  const agentsDest = path.join(targetRoot, "AGENTS.md");
  if (!fs.existsSync(agentsDest)) {
    copyRecursive(path.join(sourceRoot, "AGENTS.md"), agentsDest);
    console.log("  + template  : AGENTS.md");
  } else if (fs.readFileSync(agentsDest, "utf8").includes("KAF Workflow")) {
    copyRecursive(path.join(sourceRoot, "AGENTS.md"), agentsDest);
    console.log("  + kit       : AGENTS.md (versi KAF diperbarui)");
  } else {
    copyRecursive(path.join(sourceRoot, "AGENTS.md"), path.join(targetRoot, "AGENTS.kaf.md"));
    console.log("  ! AGENTS.md proyek sudah ada → aturan KAF ditulis ke AGENTS.kaf.md (gabungkan manual)");
  }

  const gitignore = path.join(targetRoot, ".gitignore");
  const current = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, "utf8") : "";
  const lines = current.split("\n").map((l) => l.trim());
  const missing = GITIGNORE_ENTRIES.filter((e) => !lines.includes(e));
  if (missing.length > 0) {
    const prefix = current && !current.endsWith("\n") ? "\n" : "";
    fs.writeFileSync(gitignore, `${current}${prefix}\n# KAF Workflow (file sementara)\n${missing.join("\n")}\n`, "utf8");
    console.log(`  + .gitignore: ${missing.join(", ")}`);
  }

  fs.mkdirSync(path.join(targetRoot, "docs", "discovery"), { recursive: true });
  fs.mkdirSync(path.join(targetRoot, "docs", "specs"), { recursive: true });

  console.log("\n[KAF Installer] SELESAI. Langkah berikutnya:");
  console.log("  1. Isi kaf.config.json (nama app, stack, auth.mode, discovery.source).");
  console.log("  2. Sesuaikan docs/UI/design_system.md dengan brand proyek.");
  console.log("  3. Mulai fitur: /kaf-1-discovery <slug>  →  /kaf-2-spec <slug>  →  /kaf-3-coding <slug>");
}

main();
