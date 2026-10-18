#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const targetSlug = process.argv[2] || "";

function getGitBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { stdio: "pipe", encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function listSlugs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("."))
    .map((f) => f.replace(/\.md$/, ""));
}

function parseSpecTasks(specPath) {
  if (!fs.existsSync(specPath)) return null;
  const content = fs.readFileSync(specPath, "utf8");
  const statusMatch = content.match(/^>\s*\*\*Status:\*\*\s*(.+)$/m);
  const specStatus = statusMatch ? statusMatch[1].trim() : "Draft";

  const taskLines = content
    .split("\n")
    .filter((l) => /\|\s*`T3[ABC]\.\d+`/.test(l));

  const doneCount = taskLines.filter((l) => l.includes("[x]")).length;
  return {
    specStatus,
    total: taskLines.length,
    done: doneCount,
    tableRows: taskLines,
  };
}

function main() {
  const branch = getGitBranch();
  const discoverySlugs = listSlugs("docs/discovery");
  const specSlugs = listSlugs("docs/specs");
  const allSlugs = Array.from(new Set([...discoverySlugs, ...specSlugs])).sort();

  console.log(`====================================================================`);
  console.log(` STATUS SDLC & DAFTAR TUGAS (Branch Aktif: ${branch})`);
  console.log(`====================================================================\n`);

  if (allSlugs.length === 0) {
    console.log("Belum ada modul di docs/discovery/ atau docs/specs/.");
    return;
  }

  console.log(`Ringkasan Modul:`);
  for (const slug of allSlugs) {
    const hasDisc = discoverySlugs.includes(slug) ? "Ada" : "Belum";
    const specInfo = parseSpecTasks(path.join("docs", "specs", `${slug}.md`));
    if (!specInfo) {
      console.log(`- [${slug}] -> Tahap 1 Discovery: ${hasDisc} | Tahap 2 Spec: Belum`);
    } else {
      console.log(
        `- [${slug}] -> Spec: ${specInfo.specStatus} | Task Selesai: ${specInfo.done}/${specInfo.total}`,
      );
    }
  }

  const slugsToDetail = targetSlug ? [targetSlug] : specSlugs;
  for (const slug of slugsToDetail) {
    const specPath = path.join("docs", "specs", `${slug}.md`);
    const info = parseSpecTasks(specPath);
    if (!info) continue;
    console.log(`\n--------------------------------------------------------------------`);
    console.log(` Daftar Tugas Modul: ${slug} (${info.done}/${info.total} Selesai)`);
    console.log(`--------------------------------------------------------------------`);
    console.log(`| Kode | Slice | Status | Tugas & File Target |`);
    console.log(`| :--- | :--- | :--- | :--- |`);
    for (const row of info.tableRows) {
      console.log(row);
    }
  }
}

main();
