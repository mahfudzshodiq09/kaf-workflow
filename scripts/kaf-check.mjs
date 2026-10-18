#!/usr/bin/env node
/**
 * KAF Static Check — pemeriksaan otomatis TANPA token AI untuk file satu modul.
 *
 * Cara pakai:
 *   node scripts/kaf-check.mjs --slug <slug>
 *
 * Temuan "WAJIB" membuat exit code 1 (dipakai kaf-code.mjs sebagai gerbang).
 * Temuan "SARAN" hanya dicetak.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_LINES = Number(process.env.KAF_MAX_LINES || 400);

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function dataTableFindings(rel, text) {
  const found = [];
  const re = /<DataTable\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const rest = text.slice(m.index);
    const end = rest.search(/<Column\b|<\/DataTable>/);
    const openTag = end === -1 ? rest.slice(0, 2000) : rest.slice(0, end);
    if (/\bpaginator\b/.test(openTag) && !/\blazy\b/.test(openTag) && !/kaf-allow-client-paginator/.test(openTag)) {
      found.push({
        level: "WAJIB",
        where: `${rel}:${lineOf(text, m.index)}`,
        message:
          "<DataTable paginator> tanpa `lazy`. Data dari database wajib lazy + totalRecords + onPage via searchParams (skip/take di server). Untuk daftar kecil yang memang statis, tambahkan komentar {/* kaf-allow-client-paginator: alasan */} di dalam tag.",
      });
    }
  }
  return found;
}

export function checkFiles(files) {
  const findings = [];
  for (const rel of files) {
    if (!fs.existsSync(rel) || !/\.(ts|tsx)$/.test(rel)) continue;
    const text = fs.readFileSync(rel, "utf8");
    const lines = text.split("\n");
    const lineCount = text.endsWith("\n") ? lines.length - 1 : lines.length;

    if (rel.startsWith("src/") && lineCount > MAX_LINES) {
      findings.push({
        level: "WAJIB",
        where: rel,
        message: `${lineCount} baris (maks ${MAX_LINES}). Pecah per peran/area.`,
      });
    }

    lines.forEach((line, i) => {
      if (/(:\s*any\b|\bas\s+any\b|<any>|@ts-ignore|@ts-nocheck)/.test(line)) {
        findings.push({ level: "WAJIB", where: `${rel}:${i + 1}`, message: "Pakai `any` / @ts-ignore." });
      }
      if (rel.endsWith(".tsx") && /["'`]#[0-9a-fA-F]{6}\b|["'`]#[0-9a-fA-F]{3}["'`]/.test(line)) {
        findings.push({ level: "SARAN", where: `${rel}:${i + 1}`, message: "Warna hex langsung; pakai variabel --primary-*/--neutral-*." });
      }
    });

    if (/\/(page|layout)\.tsx$/.test(rel) && /^\s*["']use client["']/m.test(text)) {
      findings.push({ level: "WAJIB", where: rel, message: "page/layout tidak boleh 'use client' (wajib async Server Component)." });
    }

    if (rel.endsWith(".tsx")) findings.push(...dataTableFindings(rel, text));
  }
  return findings;
}

export function formatFindings(findings) {
  return findings.map((f) => `- [${f.level}] ${f.where} — ${f.message}`).join("\n");
}

export function moduleFiles(slug) {
  const out = [];
  const single = [`src/lib/validations/${slug}.ts`, `src/actions/${slug}.ts`, `scripts/verify-${slug}-backend.ts`];
  for (const f of single) if (fs.existsSync(f)) out.push(f);
  const dirs = [`src/lib/${slug}`, `src/actions/${slug}`, `src/app/${slug}`, `src/components/${slug}`];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name).split(path.sep).join("/");
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
    }
  }
  dirs.forEach(walk);
  return out;
}

function main() {
  const i = process.argv.indexOf("--slug");
  const slug = i > -1 ? process.argv[i + 1] : "";
  if (!slug) {
    console.error("Usage: node scripts/kaf-check.mjs --slug <slug>");
    process.exit(1);
  }
  const files = moduleFiles(slug);
  const findings = checkFiles(files);
  console.log(`[kaf-check] ${files.length} file diperiksa untuk modul "${slug}".`);
  if (findings.length === 0) {
    console.log("[kaf-check] LULUS: tidak ada temuan.");
    return;
  }
  console.log(formatFindings(findings));
  if (findings.some((f) => f.level === "WAJIB")) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
