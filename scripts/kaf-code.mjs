#!/usr/bin/env node
/**
 * KAF Runner Tahap 3 & 4 — satu perintah untuk 3A → 3B → 3C → 4.
 *
 *   node scripts/kaf-code.mjs --slug <slug> [--slice ALL|3A|3B|3C|4]
 *
 * Profil proyek (nama app, stack, design system, mode login, model per tahap) dibaca dari
 * kaf.config.json — skrip ini tidak berisi hal yang khusus satu proyek.
 *
 * Gerbang otomatis (0 token AI kecuali panggilan model yang memang dibutuhkan):
 *  - Spec wajib berstatus Disetujui (Gate 2); slug hanya huruf kecil/angka/strip.
 *  - Wajib di branch feat/<slug>; kalau gagal pindah branch → berhenti.
 *  - Tiap tahap hanya boleh menulis path miliknya. File bersama (schema.prisma, auth.ts yang sudah
 *    ada di main, seed modul lain, .env, package.json, scripts lain) tidak bisa ditimpa model.
 *  - Output terpotong / file src > 400 baris / file target spec tidak ada → ditolak utuh,
 *    1x coba ulang otomatis dengan umpan balik, lalu berhenti.
 *  - Schema: model menulis fragmen prisma/modules/<slug>.prisma → digabung ke schema.prisma dalam
 *    blok bertanda, `prisma format` melengkapi relasi balik, lalu dicek tidak ada model/field lama
 *    yang hilang. Gagal → schema dikembalikan persis seperti semula.
 *  - scripts/verify-<slug>-backend.ts wajib lulus · tsc wajib 0 error · kaf-check wajib bersih.
 *  - Gagal di mana pun → berhenti: tidak dicentang, tidak di-commit.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";
import { checkFiles, formatFindings, moduleFiles, MAX_LINES } from "./kaf-check.mjs";
import { CONFIG_FILE, describeAuth, describeProject, readConfig } from "./kaf-config.mjs";

const APPLY = ".agents/skills/kaf-3-coding/scripts/apply-code-bundle.mjs";
const RULES = ".agents/skills/kaf-3-coding/resources/bundle-format-rules.md";
const CHECKLIST = ".agents/skills/kaf-4-review/resources/review-checklist.md";
const SCHEMA = "prisma/schema.prisma";
const AUTH = "src/lib/auth.ts";
const PRISMA_CLIENT = "src/lib/prisma.ts";

function baseSchema(provider) {
  return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}
`;
}

const PRISMA_CLIENT_SOURCE = `import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
`;

class StopError extends Error {}
function stop(message) {
  throw new StopError(message);
}

function parseArgs(argv) {
  const args = { slug: "", slice: "ALL" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--slug" && argv[i + 1]) args.slug = argv[++i];
    else if (argv[i] === "--slice" && argv[i + 1]) args.slice = argv[++i].toUpperCase();
  }
  return args;
}

function tryRun(cmd, env) {
  try {
    return { ok: true, output: execSync(cmd, { stdio: "pipe", encoding: "utf8", env: env ? { ...process.env, ...env } : process.env }) };
  } catch (err) {
    return { ok: false, output: `${err.stdout || ""}\n${err.stderr || ""}` };
  }
}

function tail(text, n = 30) {
  return text.trim().split("\n").slice(-n).join("\n");
}

function lineCount(file) {
  const text = fs.readFileSync(file, "utf8");
  return text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

// ---------------------------------------------------------------- Git & Gate 2

function baseBranch() {
  for (const b of ["main", "master"]) {
    if (tryRun(`git rev-parse --verify --quiet ${b}`).ok) return b;
  }
  return "";
}

function existsOnBase(file) {
  const base = baseBranch();
  if (!base) return fs.existsSync(file);
  return tryRun(`git cat-file -e ${base}:${file}`).ok;
}

function assertGate2(specPath) {
  const content = fs.readFileSync(specPath, "utf8");
  const status = content.match(/^>\s*\*\*Status:\*\*\s*(.+)$/m)?.[1]?.trim() || "";
  if (!/(✅|Disetujui|Selesai)/.test(status)) {
    stop(
      `Spec belum disetujui (Gate 2). Status sekarang: "${status || "tidak ada"}".\n` +
        `Review dulu ${specPath}, lalu ubah baris Status menjadi "> **Status:** ✅ Disetujui & Terkunci oleh Developer (Gate 2)".`,
    );
  }
}

function ensureFeatureBranch(slug) {
  const target = `feat/${slug}`;
  const head = tryRun("git rev-parse --abbrev-ref HEAD");
  if (!head.ok) stop("Folder ini belum repo git. Jalankan `git init` dan commit awal dulu.");
  const current = head.output.trim();
  if (current === target) {
    console.log(`[Git] Sudah berada di branch: ${target}`);
    return;
  }

  const dirty = tryRun("git status --porcelain").output.split("\n").filter(Boolean);
  const outsideDocs = dirty.filter((l) => {
    const file = l.slice(3).replace(/^"|"$/g, "");
    return !file.startsWith("docs/") && !file.endsWith(".tsbuildinfo");
  });
  if (outsideDocs.length > 0) {
    stop(
      `Ada perubahan belum di-commit di luar docs/ (branch ${current}):\n${outsideDocs.join("\n")}\n` +
        "Commit atau stash dulu supaya tidak ikut tercampur ke branch fitur.",
    );
  }

  const exists = tryRun(`git rev-parse --verify --quiet ${target}`).ok;
  try {
    execFileSync("git", exists ? ["checkout", target] : ["checkout", "-b", target], { stdio: "inherit" });
  } catch {
    stop(`Gagal pindah ke branch ${target}. Proses dihentikan supaya kode tidak masuk ke ${current}.`);
  }
  console.log(`[Git] Aktif di branch modul: ${target}`);
}

function checkpoint(message) {
  try {
    execFileSync("git", ["add", "-A"], { stdio: "pipe" });
    execFileSync("git", ["commit", "-m", message], { stdio: "pipe" });
    console.log(`[Git] Checkpoint: ${message}`);
  } catch (err) {
    const out = `${err.stdout || ""}${err.stderr || ""}`;
    if (!/nothing to commit/.test(out)) console.warn(`[Git] Peringatan commit: ${tail(out, 5)}`);
  }
}

function assertProjectReady() {
  if (!fs.existsSync("package.json")) {
    stop("package.json belum ada. Siapkan proyek Next.js + Prisma dulu (README bagian 'Proyek Baru').");
  }
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const missing = ["prisma", "@prisma/client", "typescript", "tsx"].filter((d) => !deps[d]);
  if (missing.length > 0) stop(`Dependensi wajib belum terpasang: ${missing.join(", ")} (README bagian 'Proyek Baru').`);
}

// ---------------------------------------------------------------- Spec checklist

function specRows(specPath, prefix) {
  return fs
    .readFileSync(specPath, "utf8")
    .split("\n")
    .filter((line) => line.includes(`\`${prefix}`) && line.includes("|"));
}

function isSliceDone(specPath, prefix) {
  const rows = specRows(specPath, prefix);
  return rows.length > 0 && rows.every((line) => line.includes("[x] Selesai"));
}

function markSliceDone(specPath, prefix) {
  const content = fs.readFileSync(specPath, "utf8");
  const updated = content
    .split("\n")
    .map((line) =>
      line.includes(`\`${prefix}`) && line.includes("|") ? line.replace(/\[\s*\]\s*(Belum|Proses)/g, "[x] Selesai") : line,
    )
    .join("\n");
  fs.writeFileSync(specPath, updated, "utf8");
}

function specTargets(specPath, prefix, slug) {
  const targets = new Set();
  for (const row of specRows(specPath, prefix)) {
    const cell = row.split("|").map((c) => c.trim())[4] || "";
    for (const m of cell.matchAll(/`([^`]+)`/g)) {
      const p = m[1].trim().replaceAll("[slug]", slug);
      if (p.includes("/") && !/\s/.test(p)) targets.add(p);
    }
  }
  return [...targets];
}

function targetExists(p) {
  if (p.endsWith("/")) return fs.existsSync(p) && fs.readdirSync(p).length > 0;
  return fs.existsSync(p);
}

// ---------------------------------------------------------------- Model calls & bundles

function callModel({ role, system, prompt, files, out }) {
  const existing = files.filter((f) => fs.existsSync(f));
  try {
    execFileSync(
      process.execPath,
      ["scripts/9router.mjs", "--role", role, "--system", system, "--prompt", prompt, "--files", existing.join(","), "--out", out],
      { stdio: "inherit" },
    );
    return { truncated: false };
  } catch (err) {
    if (err.status === 3) return { truncated: true };
    stop(`9router gagal (exit ${err.status}). Cek koneksi/kuota model, lalu jalankan ulang perintah yang sama.`);
  }
}

function applyBundle(bundle, allow) {
  try {
    const output = execFileSync(
      process.execPath,
      [APPLY, "--in", bundle, "--allow", allow.join(","), "--max-lines", String(MAX_LINES)],
      { stdio: "pipe", encoding: "utf8" },
    );
    process.stdout.write(output);
    return { ok: true };
  } catch (err) {
    const text = `${err.stdout || ""}${err.stderr || ""}`;
    return { ok: false, error: text.match(/KAF_BUNDLE_ERROR: (.+)/)?.[1] || tail(text, 5) };
  }
}

/**
 * Panggil model, terapkan bundle, cek file target spec. Kalau ditolak, ulang 1x dengan umpan balik.
 * Bundle yang gagal disimpan (docs/specs/.bundle-<tahap>-<slug>.txt, di-gitignore) untuk diperiksa.
 */
function generate({ name, slug, specPath, prefix, role, system, prompt, files, allow, stopMarker }) {
  const bundle = `docs/specs/.bundle-${name}-${slug}.txt`;
  let feedback = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { truncated } = callModel({ role, system, prompt: prompt + feedback, files, out: bundle });
    let problem = "";

    if (truncated) {
      problem =
        "Output terpotong karena terlalu panjang. Tulis lebih ringkas: hanya file wajib, tanpa teks penjelasan di luar blok FILE.";
    } else {
      const raw = fs.existsSync(bundle) ? fs.readFileSync(bundle, "utf8") : "";
      const marker = stopMarker ? raw.match(new RegExp(`^${stopMarker}:(.*)$`, "m")) : null;
      if (marker) stop(`Model melapor ${stopMarker}:${marker[1]}\nUbah bagian itu manual (atau revisi spec), lalu jalankan ulang.`);
      const res = applyBundle(bundle, allow);
      if (!res.ok) problem = res.error;
      else {
        const missing = specTargets(specPath, prefix, slug).filter((t) => !targetExists(t));
        if (missing.length > 0) problem = `File target di tabel spec belum ditulis: ${missing.join(", ")}.`;
      }
    }

    if (!problem) {
      fs.rmSync(bundle, { force: true });
      return;
    }
    console.log(`\n[KAF ${name.toUpperCase()}] Ditolak (percobaan ${attempt}/2): ${problem}`);
    feedback =
      `\n\nPERCOBAAN SEBELUMNYA DITOLAK OTOMATIS: ${problem}\n` +
      `Perbaiki: tulis HANYA path yang diizinkan (${allow.join(", ")}), setiap file .ts/.tsx di src/ maksimal ${MAX_LINES} baris ` +
      "(pecah per peran/area), dan tutup setiap blok dengan === END FILE: <path> ===.";
  }
  stop(`Tahap ${name.toUpperCase()} gagal 2x. Output terakhir: ${bundle}. Tidak ada yang dicentang/di-commit.`);
}

// ---------------------------------------------------------------- Schema merge (Fix: modul baru tidak menimpa modul lama)

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blockMarkers(slug) {
  return {
    start: `// >>> kaf-modul: ${slug} (dikelola kaf-code; jangan hapus penanda ini)`,
    end: `// <<< kaf-modul: ${slug}`,
  };
}

function removeModuleBlock(text, slug) {
  const re = new RegExp(`\\n*// >>> kaf-modul: ${escapeRe(slug)}\\b[^\\n]*\\n[\\s\\S]*?// <<< kaf-modul: ${escapeRe(slug)}[^\\n]*\\n?`);
  return text.replace(re, "\n");
}

function parseSchemaBlocks(text) {
  const blocks = new Map();
  for (const m of text.matchAll(/^(model|enum|view|type)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const members = new Set();
    for (const line of m[3].split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("//") || t.startsWith("@@")) continue;
      members.add(t.split(/\s+/)[0]);
    }
    blocks.set(`${m[1]} ${m[2]}`, members);
  }
  return blocks;
}

const DUMMY_DATABASE_URL = {
  postgresql: "postgresql://kaf:kaf@localhost:5432/kaf",
  cockroachdb: "postgresql://kaf:kaf@localhost:26257/kaf",
  mysql: "mysql://kaf:kaf@localhost:3306/kaf",
  sqlite: "file:./dev.db",
  sqlserver: "sqlserver://localhost:1433;database=kaf;user=kaf;password=kaf;trustServerCertificate=true",
};

/** format/validate/generate tidak butuh koneksi DB — beri URL dummy hanya bila DATABASE_URL belum ada di env maupun .env. */
function prismaEnv(provider) {
  const inDotEnv = fs.existsSync(".env") && /^\s*DATABASE_URL\s*=/m.test(fs.readFileSync(".env", "utf8"));
  if (process.env.DATABASE_URL || inDotEnv) return undefined;
  return { DATABASE_URL: DUMMY_DATABASE_URL[provider] };
}

function mergeSchemaFragment(slug, provider) {
  const fragmentPath = `prisma/modules/${slug}.prisma`;
  const fragment = fs
    .readFileSync(fragmentPath, "utf8")
    .replace(/^(generator|datasource)\s+\w+\s*\{[\s\S]*?^\}\s*/gm, "")
    .trim();

  const created = [];
  if (!fs.existsSync(SCHEMA)) {
    fs.mkdirSync(path.dirname(SCHEMA), { recursive: true });
    fs.writeFileSync(SCHEMA, baseSchema(provider), "utf8");
    created.push(SCHEMA);
  }
  if (!fs.existsSync(PRISMA_CLIENT)) {
    fs.mkdirSync(path.dirname(PRISMA_CLIENT), { recursive: true });
    fs.writeFileSync(PRISMA_CLIENT, PRISMA_CLIENT_SOURCE, "utf8");
    created.push(PRISMA_CLIENT);
  }
  const env = prismaEnv(provider);

  const before = fs.readFileSync(SCHEMA, "utf8");
  const othersBefore = removeModuleBlock(before, slug);
  const { start, end } = blockMarkers(slug);
  fs.writeFileSync(SCHEMA, `${othersBefore.trimEnd()}\n\n${start}\n${fragment}\n${end}\n`, "utf8");

  const restore = (why) => {
    if (created.includes(SCHEMA)) fs.rmSync(SCHEMA, { force: true });
    else fs.writeFileSync(SCHEMA, before, "utf8");
    if (created.includes(PRISMA_CLIENT)) fs.rmSync(PRISMA_CLIENT, { force: true });
    stop(`schema.prisma dikembalikan persis seperti semula. Alasan: ${why}`);
  };

  const fmt = tryRun("npx prisma format", env);
  if (!fmt.ok) restore(`prisma format gagal:\n${tail(fmt.output, 25)}`);

  const after = fs.readFileSync(SCHEMA, "utf8");
  if (!after.includes(start) || !after.includes(end)) restore("penanda blok modul hilang setelah prisma format.");

  const oldBlocks = parseSchemaBlocks(othersBefore);
  const newBlocks = parseSchemaBlocks(after);
  const lost = [];
  for (const [name, members] of oldBlocks) {
    const now = newBlocks.get(name);
    if (!now) {
      lost.push(`${name} hilang`);
      continue;
    }
    for (const m of members) if (!now.has(m)) lost.push(`${name}.${m} hilang`);
  }
  if (lost.length > 0) restore(`model/field milik modul lain berubah: ${lost.join(", ")}`);

  const validate = tryRun("npx prisma validate", env);
  if (!validate.ok) restore(`prisma validate gagal (mis. model sudah ada di modul lain):\n${tail(validate.output, 25)}`);
  const generateClient = tryRun("npx prisma generate", env);
  if (!generateClient.ok) restore(`prisma generate gagal:\n${tail(generateClient.output, 25)}`);

  fs.rmSync(fragmentPath, { force: true });
  if (fs.existsSync("prisma/modules") && fs.readdirSync("prisma/modules").length === 0) fs.rmdirSync("prisma/modules");
  console.log(`[KAF 3A] Schema digabung ke ${SCHEMA} (blok "kaf-modul: ${slug}"); model lama utuh, validate & generate lulus.`);
}

// ---------------------------------------------------------------- Verify, tsc, kontrak 3C

function runVerify(verifyPath) {
  if (!fs.existsSync(verifyPath)) stop(`${verifyPath} tidak ada. Tes backend wajib (lihat bundle-format-rules.md §5).`);
  console.log(`[KAF] Menjalankan tes backend: ${verifyPath}`);
  const res = tryRun(`npx tsx ${verifyPath}`);
  if (!res.ok) {
    const failed = [...res.output.matchAll(/^AssertionError[^:]*: (.+)$/gm)].map((m) => `  ✗ ${m[1]}`);
    stop(
      `Tes backend GAGAL — ada aturan/guard yang tidak sesuai spec:\n${failed.length ? failed.join("\n") : tail(res.output, 25)}\n` +
        "Tidak diperbaiki otomatis (model bisa saja 'membetulkan' tesnya, bukan kodenya). Periksa sendiri lalu jalankan ulang.",
    );
  }
  console.log(tail(res.output, 3));
}

function typecheckWithFix({ slug, allow, maxFix, role }) {
  for (let attempt = 0; ; attempt++) {
    const check = tryRun("npx tsc --noEmit");
    if (check.ok) {
      console.log("[KAF 4A] LULUS: npx tsc --noEmit (0 error).");
      return;
    }
    if (attempt >= maxFix) stop(`tsc masih error setelah ${maxFix}x perbaikan otomatis:\n${tail(check.output, 40)}`);
    console.log(`[KAF 4A] Error TypeScript (perbaikan ${attempt + 1}/${maxFix}) → minta ${role} memperbaiki...`);
    const errorFiles = [
      ...new Set([...check.output.matchAll(/^(.+?\.tsx?)\(\d+,\d+\): error/gm)].map((m) => m[1].trim())),
    ];
    const bundle = `docs/specs/.bundle-fix-${slug}.txt`;
    const { truncated } = callModel({
      role,
      system:
        "Kamu adalah Principal TypeScript & Next.js Debugger. Perbaiki error kompilasi tanpa mengubah aturan bisnis. Tulis ulang HANYA file yang perlu, utuh, di dalam blok === FILE: <path> ===.",
      prompt: `Perbaiki error tsc --noEmit berikut. Path yang boleh ditulis: ${allow.join(", ")}.\n\n${tail(check.output, 120)}`,
      files: [RULES, `src/lib/validations/${slug}.ts`, ...errorFiles],
      out: bundle,
    });
    if (truncated) stop("Perbaikan tsc terpotong (output kepanjangan). Periksa error manual.");
    const res = applyBundle(bundle, allow);
    if (!res.ok) stop(`Perbaikan tsc ditolak: ${res.error}`);
    fs.rmSync(bundle, { force: true });
  }
}

function exportSignatures(text) {
  const sigs = [];
  for (const m of text.matchAll(/^export\s+type\s+[^\n]*$/gm)) sigs.push(m[0]);
  const re = /^export\s+(?:async\s+)?function\s+\w+/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    let paren = 0;
    let angle = 0;
    let seenParen = false;
    let i = m.index;
    for (; i < text.length; i++) {
      const c = text[i];
      if (c === "(") {
        paren++;
        seenParen = true;
      } else if (c === ")") paren--;
      else if (c === "<") angle++;
      else if (c === ">" && text[i - 1] !== "=") angle--;
      else if (c === "{" && seenParen && paren === 0 && angle <= 0) break;
    }
    sigs.push(`${text.slice(m.index, i).trim()};`);
  }
  return sigs;
}

function writeContract(slug) {
  const contract = `docs/specs/.bundle-contract-${slug}.txt`;
  const parts = [`// Kontrak backend modul ${slug} (dibuat otomatis dari kode 3B — import dari path di bawah)`];
  for (const f of moduleFiles(slug).filter((p) => p.startsWith(`src/actions/${slug}`))) {
    parts.push(`\n// file: ${f}  (import dari "@/${f.slice(4).replace(/\.tsx?$/, "")}")`);
    parts.push(...exportSignatures(fs.readFileSync(f, "utf8")));
  }
  fs.writeFileSync(contract, parts.join("\n") + "\n", "utf8");
  return contract;
}

// ---------------------------------------------------------------- Main

async function main() {
  const { slug, slice } = parseArgs(process.argv);
  if (!slug) {
    console.error("Usage: node scripts/kaf-code.mjs --slug <fitur-slug> [--slice ALL|3A|3B|3C|4]");
    process.exit(1);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) stop(`Slug "${slug}" tidak valid (hanya huruf kecil, angka, strip).`);
  if (!["ALL", "3A", "3B", "3C", "4"].includes(slice)) stop(`--slice "${slice}" tidak dikenal.`);

  let cfg;
  try {
    cfg = readConfig({ required: true });
  } catch (err) {
    stop(err.message);
  }
  assertProjectReady();
  const DESIGN = cfg.designSystem;
  const project = describeProject(cfg);
  const authMode = cfg.auth.mode;
  const models = cfg.models;

  const specPath = path.join("docs", "specs", `${slug}.md`).split(path.sep).join("/");
  if (!fs.existsSync(specPath)) stop(`Spec tidak ditemukan: ${specPath}`);
  assertGate2(specPath);
  ensureFeatureBranch(slug);

  const authShared = existsOnBase(AUTH);
  const authWritable = authMode === "demo" && !authShared;
  const authContext = authMode !== "none" && !authWritable ? [AUTH] : [];
  const verifyPath = `scripts/verify-${slug}-backend.ts`;
  const allow3A = [`prisma/modules/${slug}.prisma`, `prisma/seeds/${slug}.ts`];
  const allow3B = [
    `src/lib/validations/${slug}.ts`,
    `src/lib/${slug}/**`,
    `src/actions/${slug}/**`,
    verifyPath,
    ...(authWritable ? [AUTH] : []),
  ];
  const allow3C = [`src/app/${slug}/**`, `src/components/${slug}/**`];
  const allowFix = [...allow3B, ...allow3C];

  const run = (prefix, s) => (slice === "ALL" && !isSliceDone(specPath, prefix)) || slice === s;

  if (run("T3A.", "3A")) {
    console.log("\n=== [KAF 3A] Database & Seeder via sol (schema bersama tidak ditimpa) ===");
    generate({
      name: "3a",
      slug,
      specPath,
      prefix: "T3A.",
      role: models.database,
      system:
        "Kamu adalah Senior Database & Prisma Engineer. Patuhi bundle-format-rules.md (format FILE, path yang diizinkan, anti over-engineering).",
      prompt:
        `${project}\n` +
        `Implementasikan Slice 3A modul "${slug}" berdasarkan ${specPath}. ` +
        `${SCHEMA} terlampir (jika ada) adalah schema BERSAMA milik modul lain: JANGAN ditulis ulang. Keluarkan TEPAT 2 file:\n` +
        `(1) === FILE: prisma/modules/${slug}.prisma === berisi HANYA model & enum BARU milik modul ini. Boleh mereferensikan model yang sudah ada; ` +
        "relasi balik di model lama dilengkapi otomatis oleh `prisma format`. Dilarang mendefinisikan ulang model/enum yang sudah ada, dilarang generator/datasource.\n" +
        `(2) === FILE: prisma/seeds/${slug}.ts === seeder mandiri & idempoten (upsert), \`import { prisma } from "../../src/lib/prisma";\`, ` +
        "tidak menghapus data modul lain, diakhiri pemanggilan main() + $disconnect.\n" +
        "Jika spec MENGHARUSKAN mengubah/menghapus model lama, jangan lakukan; tulis satu baris di awal output: PERLU_UBAH_MODEL_LAMA: <model & alasan>.",
      files: [RULES, CONFIG_FILE, specPath, SCHEMA],
      allow: allow3A,
      stopMarker: "PERLU_UBAH_MODEL_LAMA",
    });
    mergeSchemaFragment(slug, cfg.stack.prismaProvider);
    markSliceDone(specPath, "T3A.");
    checkpoint(`wip(${slug}): slice 3A database & seed`);
  }

  if (run("T3B.", "3B")) {
    console.log("\n=== [KAF 3B] Backend, Guard, Zod & Tes via sol ===");
    generate({
      name: "3b",
      slug,
      specPath,
      prefix: "T3B.",
      role: models.backend,
      system:
        "Kamu adalah Principal Backend Engineer (Next.js Server Actions + TypeScript + Prisma + Zod). Patuhi bundle-format-rules.md: path yang diizinkan, maks 400 baris/file, guard sebagai fungsi murni + tes, 7 Pilar Backend, nol any, nol TODO.",
      prompt:
        `${project}\n` +
        `Implementasikan Slice 3B modul "${slug}" berdasarkan ${specPath} dan ${SCHEMA}. Path yang BOLEH ditulis: ${allow3B.join(", ")}.\n` +
        (authMode === "none"
          ? `${describeAuth(cfg)} Tipe ActionResponse<T> ditaruh di src/lib/${slug}/types.ts.\n`
          : authWritable
            ? `Buat ${AUTH} (Role Switcher demo cookie demo_user_id yang mati di production, peran: ${cfg.auth.roles.join(", ")}, assertRole, assertOwnership, ActionResponse<T>) — akan dipakai bersama modul berikutnya.\n`
            : `${AUTH} SUDAH ADA dan dipakai bersama (terlampir): JANGAN ditulis ulang, cukup import fungsi/tipenya.\n`) +
        `Struktur wajib (bundle-format-rules.md §4–§5): aturan bisnis & guard sebagai FUNGSI MURNI di src/lib/${slug}/rules.ts (tanpa prisma/cookies/server-only); ` +
        `server actions dipecah per peran di src/actions/${slug}/<peran>.ts dan query halaman di src/actions/${slug}/queries.ts ('use server', maks ${MAX_LINES} baris/file); ` +
        `${verifyPath} menguji fungsi murni itu dengan node:assert: ` +
        (authMode === "none"
          ? "setiap batas/kapasitas dan setiap aturan Gate 1 di spec (kasus lolos + ditolak)."
          : "pemilik vs bukan pemilik, peran salah ditolak, kuota/kapasitas penuh ditolak, dan setiap aturan Gate 1 di spec."),
      files: [RULES, CONFIG_FILE, specPath, SCHEMA, ...authContext],
      allow: allow3B,
    });
    runVerify(verifyPath);
    markSliceDone(specPath, "T3B.");
    checkpoint(`wip(${slug}): slice 3B backend & tes`);
  }

  if (run("T3C.", "3C")) {
    console.log(`\n=== [KAF 3C] UI via ${models.ui} (kontrak backend tipis) ===`);
    const contract = writeContract(slug);
    try {
      generate({
        name: "3c",
        slug,
        specPath,
        prefix: "T3C.",
        role: models.ui,
        system:
          `Kamu adalah Senior Frontend Engineer spesialis ${cfg.stack.framework}, ${cfg.stack.ui}, dan ikon ${cfg.stack.icons}. ` +
          `Patuhi bundle-format-rules.md dan ${DESIGN} (tanpa hex langsung, variabel CSS, 9 Kontrak UI, tabel lazy, maks ${MAX_LINES} baris/file` +
          (authMode === "demo" ? ", pita simulasi peran di atas halaman)." : ")."),
        prompt:
          `${project}\n` +
          `Implementasikan Slice 3C modul "${slug}" berdasarkan ${DESIGN} dan ${specPath}. Rute halaman = /${slug}. ` +
          `Path yang BOLEH ditulis: ${allow3C.join(", ")}.\n` +
          `Kontrak backend (signature server actions) ada di ${contract} dan tipe/validasi di src/lib/validations/${slug}.ts: pakai nama fungsi persis, jangan menebak fungsi lain. ` +
          `Komponen client dipecah per area (maks ${MAX_LINES} baris/file). Tabel data dari database wajib lazy (bundle-format-rules.md §6).`,
        files: [RULES, CONFIG_FILE, DESIGN, specPath, `src/lib/validations/${slug}.ts`, contract],
        allow: allow3C,
      });
    } finally {
      fs.rmSync(contract, { force: true });
    }
    markSliceDone(specPath, "T3C.");
    checkpoint(`wip(${slug}): slice 3C UI`);
  }

  if (slice === "ALL" || slice === "4") {
    console.log("\n=== [KAF 4A] TypeScript, Tes Backend & Cek Statis ===");
    typecheckWithFix({ slug, allow: allowFix, maxFix: 2, role: models.backend });
    runVerify(verifyPath);
    const autoFindings = checkFiles(moduleFiles(slug));

    console.log(`\n=== [KAF 4B] Audit Kualitas & Design System via ${models.review} ===`);
    const auditBundle = `docs/specs/.bundle-audit-${slug}.txt`;
    const { truncated } = callModel({
      role: models.review,
      system:
        `Kamu adalah Principal Code Reviewer & Design System Auditor untuk ${cfg.project.name}. Audit file terlampir terhadap review-checklist.md, bundle-format-rules.md, dan ${DESIGN}. ` +
        "Format jawaban WAJIB salah satu: (a) tepat satu baris LULUS_AUDIT_TANPA_PERBAIKAN, atau (b) maksimal 10 baris temuan singkat lalu file perbaikan utuh dalam blok === FILE: <path> === (hanya file yang berubah, maks 400 baris/file).",
      prompt:
        `${project}\nAudit & perbaiki modul "${slug}". Path yang boleh ditulis: ${allowFix.join(", ")}.\n` +
        `Temuan otomatis kaf-check (yang [WAJIB] harus diperbaiki):\n${formatFindings(autoFindings) || "- tidak ada"}`,
      files: [RULES, CHECKLIST, CONFIG_FILE, DESIGN, specPath, SCHEMA, ...authContext, ...moduleFiles(slug)],
      out: auditBundle,
    });
    if (truncated) stop(`Audit terpotong (output kepanjangan). Lihat ${auditBundle}.`);

    const raw = fs.readFileSync(auditBundle, "utf8");
    const hasFixes = /^===\s*FILE:/m.test(raw);
    const notes = raw.split(/^===\s*FILE:/m)[0].trim();
    if (notes) console.log(`[KAF 4B] Catatan reviewer:\n${tail(notes, 12)}`);
    if (!hasFixes && !/LULUS_AUDIT_TANPA_PERBAIKAN|^STATUS:\s*PASS/m.test(raw)) {
      stop(`Jawaban reviewer tidak jelas (bukan LULUS dan tidak ada perbaikan). Lihat ${auditBundle}.`);
    }
    if (hasFixes) {
      const res = applyBundle(auditBundle, allowFix);
      if (!res.ok) stop(`Perbaikan audit ditolak: ${res.error}. Lihat ${auditBundle}.`);
      console.log("[KAF 4B] Perbaikan audit diterapkan → validasi ulang...");
      typecheckWithFix({ slug, allow: allowFix, maxFix: 1, role: models.backend });
      runVerify(verifyPath);
    }
    fs.rmSync(auditBundle, { force: true });

    const findings = checkFiles(moduleFiles(slug));
    if (findings.some((f) => f.level === "WAJIB")) {
      stop(`kaf-check masih menemukan pelanggaran wajib:\n${formatFindings(findings)}`);
    }
    if (findings.length > 0) console.log(`[kaf-check] Saran:\n${formatFindings(findings)}`);

    checkpoint(`feat(${slug}): tahap 3 & 4 lulus gerbang otomatis`);

    const base = baseBranch() || "main";
    console.log("\n=== Siap UAT (Gate 3) — bahan review manusia ===");
    for (const f of moduleFiles(slug)) console.log(`  ${String(lineCount(f)).padStart(4)} baris  ${f}`);
    console.log(`Baca sendiri minimal: src/lib/${slug}/rules.ts dan src/actions/${slug}/ (guard, transaksi, kuota).`);
    console.log(`Perubahan schema: git diff ${base}...HEAD -- ${SCHEMA}`);
    console.log(`Database lokal: npx prisma db push && npx tsx prisma/seeds/${slug}.ts`);
  }

  console.log(`\n[kaf-code] SELESAI untuk modul "${slug}" (Slice: ${slice}).`);
}

main().catch((err) => {
  if (err instanceof StopError) {
    console.error(`\n[kaf-code] BERHENTI: ${err.message}`);
  } else {
    console.error("[kaf-code Fatal Error]:", err.message);
  }
  process.exit(1);
});
