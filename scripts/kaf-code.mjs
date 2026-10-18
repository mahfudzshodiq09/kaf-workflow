#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";

function parseArgs(argv) {
  const args = { slug: "", slice: "ALL" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--slug" && argv[i + 1]) args.slug = argv[++i];
    else if (argv[i] === "--slice" && argv[i + 1]) args.slice = argv[++i].toUpperCase();
  }
  return args;
}

function ensureFeatureBranch(slug) {
  const targetBranch = `feat/${slug}`;
  try {
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
    if (currentBranch === targetBranch) {
      console.log(`[Git] Sudah berada di branch: ${targetBranch}`);
      return;
    }
    const branches = execSync("git branch --list " + targetBranch, {
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
    if (branches) {
      execSync(`git checkout ${targetBranch}`, { stdio: "inherit" });
    } else {
      execSync(`git checkout -b ${targetBranch}`, { stdio: "inherit" });
    }
    console.log(`[Git] Aktif di branch modul: ${targetBranch}`);
  } catch (err) {
    console.warn(`[Git] Peringatan branch (${targetBranch}):`, err.message);
  }
}

function collectModuleFiles(slug) {
  const candidates = [
    `src/lib/validations/${slug}.ts`,
    `src/actions/${slug}.ts`,
  ];
  const dirsToScan = [
    path.join("src", "app", slug),
    path.join("src", "components", slug),
  ];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        candidates.push(full);
      }
    }
  }

  for (const d of dirsToScan) walk(d);
  return candidates.filter((f) => fs.existsSync(f));
}

function updateSpecTableStatus(specPath, prefix, newStatus) {
  if (!fs.existsSync(specPath)) return;
  const content = fs.readFileSync(specPath, "utf8");
  const lines = content.split("\n");
  const updated = lines.map((line) => {
    if (line.includes(`\`${prefix}`) && line.includes("|")) {
      return line.replace(/\[\s*\]\s*(Belum|Proses)/g, newStatus);
    }
    return line;
  });
  fs.writeFileSync(specPath, updated.join("\n"), "utf8");
}

function isSliceDone(specPath, prefix) {
  if (!fs.existsSync(specPath)) return false;
  const content = fs.readFileSync(specPath, "utf8");
  const matchingLines = content
    .split("\n")
    .filter((line) => line.includes(`\`${prefix}`) && line.includes("|"));
  if (matchingLines.length === 0) return false;
  return matchingLines.every((line) => line.includes("[x] Selesai"));
}

function run9Router({ role, system, prompt, files, out, allowEmptyBundle = false }) {
  execFileSync(
    process.execPath,
    [
      "scripts/9router.mjs",
      "--role",
      role,
      "--system",
      system,
      "--prompt",
      prompt,
      "--files",
      files.filter((f) => fs.existsSync(f)).join(","),
      "--out",
      out,
    ],
    { stdio: "inherit" },
  );
  if (fs.existsSync(out)) {
    const content = fs.readFileSync(out, "utf8");
    if (allowEmptyBundle && !/^===\s*FILE:\s*.+?===\s*$/m.test(content)) {
      console.log("[KAF 4] Audit selesai: Tidak ada file yang perlu ditimpa (LULUS AUDIT).");
      fs.unlinkSync(out);
      return false;
    }
    execFileSync(
      process.execPath,
      [".agents/skills/kaf-3-coding/scripts/apply-code-bundle.mjs", "--in", out],
      { stdio: "inherit" },
    );
    fs.unlinkSync(out);
    return true;
  }
  return false;
}

function runTypeCheck() {
  try {
    execSync("npx tsc --noEmit", { stdio: "pipe", encoding: "utf8" });
    return { ok: true, output: "" };
  } catch (err) {
    return {
      ok: false,
      output: String(err.stdout || "") + "\n" + String(err.stderr || ""),
    };
  }
}

async function main() {
  const { slug, slice } = parseArgs(process.argv);
  if (!slug) {
    console.error("Usage: node scripts/kaf-code.mjs --slug <fitur-slug> [--slice ALL|3A|3B|3C|4]");
    process.exit(1);
  }

  const specPath = path.join("docs", "specs", `${slug}.md`);
  if (!fs.existsSync(specPath)) {
    console.error(`[kaf-code] Spec tidak ditemukan: ${specPath}`);
    process.exit(1);
  }

  ensureFeatureBranch(slug);

  const rulesFile = ".agents/skills/kaf-3-coding/resources/bundle-format-rules.md";
  const reviewChecklistFile = ".agents/skills/kaf-4-review/resources/review-checklist.md";
  const designFile = "docs/UI/design_system.md";

  if ((slice === "ALL" && !isSliceDone(specPath, "T3A.")) || slice === "3A") {
    console.log("\n=== [KAF 3A] Menjalankan Database & Seeder via sol ===");
    run9Router({
      role: "sol",
      system:
        "Kamu adalah Senior Database & Prisma Engineer. Patuhi seluruh aturan di bundle-format-rules.md: Jangan Over-Engineering, Anti AI-Slop, dan tulis kode 100% lengkap di dalam blok === FILE: <path> ===.",
      prompt: `Implementasikan Slice 3A (Database & Seed) berdasarkan spesifikasi ${specPath}. Hasilkan prisma/schema.prisma, src/lib/prisma.ts, dan prisma/seed.ts secara utuh dalam format === FILE: ... ===.`,
      files: [rulesFile, specPath],
      out: `docs/specs/.bundle-3a-${slug}.txt`,
    });
    execSync("npx prisma validate && npx prisma generate", { stdio: "inherit" });
    updateSpecTableStatus(specPath, "T3A.", "[x] Selesai");
  }

  if ((slice === "ALL" && !isSliceDone(specPath, "T3B.")) || slice === "3B") {
    console.log("\n=== [KAF 3B] Menjalankan Backend, Auth & Zod via sol ===");
    run9Router({
      role: "sol",
      system:
        "Kamu adalah Principal Backend Engineer (Next.js Server Actions + TypeScript + Prisma + Zod). Patuhi bundle-format-rules.md: Jangan Over-Engineering, Anti AI-Slop (nol any, nol TODO), dan patuhi 7 Pilar Backend.",
      prompt: `Implementasikan Slice 3B untuk modul ${slug} berdasarkan ${specPath} dan prisma/schema.prisma. Hasilkan src/lib/auth.ts, src/lib/validations/${slug}.ts, dan src/actions/${slug}.ts dalam format === FILE: ... ===.`,
      files: [rulesFile, specPath, "prisma/schema.prisma"],
      out: `docs/specs/.bundle-3b-${slug}.txt`,
    });
    updateSpecTableStatus(specPath, "T3B.", "[x] Selesai");
  }

  if ((slice === "ALL" && !isSliceDone(specPath, "T3C.")) || slice === "3C") {
    console.log("\n=== [KAF 3C] Menjalankan UI PrimeReact via claude/flash (Thin Contract Context) ===");
    run9Router({
      role: "claude",
      system:
        "Kamu adalah Senior Frontend Engineer spesialis Next.js 15 App Router, PrimeReact 10, lucide-react, dan Tailwind CSS. Patuhi bundle-format-rules.md dan docs/UI/design_system.md (nol hex #... di komponen, gunakan CSS variabel --primary-*, --neutral-*, ikon lucide-react, pita 'Ganti peran', dan 9 Kontrak Standar UI PrimeReact).",
      prompt: `Implementasikan seluruh file Slice 3C (UI PrimeReact) berdasarkan docs/UI/design_system.md, ${specPath}, dan kontrak tipe/validasi src/lib/validations/${slug}.ts. Hasilkan seluruh file UI dalam format === FILE: ... ===.`,
      files: [rulesFile, designFile, specPath, `src/lib/validations/${slug}.ts`],
      out: `docs/specs/.bundle-3c-${slug}.txt`,
    });
    updateSpecTableStatus(specPath, "T3C.", "[x] Selesai");
  }

  if (slice === "ALL" || slice === "4") {
    console.log("\n=== [KAF 4A] Menjalankan Pengecekan TypeScript & Auto-Fix ===");
    for (let attempt = 1; attempt <= 2; attempt++) {
      const check = runTypeCheck();
      if (check.ok) {
        console.log("[KAF 4A] LULUS: npx tsc --noEmit (0 error).");
        break;
      }
      console.log(`[KAF 4A] Ditemukan error TypeScript (Percobaan ${attempt}/2). Meminta sol memperbaiki otomatis...`);
      const errorFiles = Array.from(
        new Set(
          check.output
            .split("\n")
            .map((line) => line.match(/^(src\/[^\s(:]+|prisma\/[^\s(:]+)/)?.[1])
            .filter(Boolean),
        ),
      );
      run9Router({
        role: "sol",
        system:
          "Kamu adalah Principal TypeScript & Next.js Debugger. Perbaiki seluruh error kompilasi TypeScript berikut tanpa mengubah kontrak bisnis dan kembalikan file yang diperbaiki secara utuh di dalam blok === FILE: <path> ===.",
        prompt: `Perbaiki error tsc --noEmit berikut:\n\n${check.output}`,
        files: [rulesFile, `src/lib/validations/${slug}.ts`, ...errorFiles],
        out: `docs/specs/.bundle-fix-${slug}.txt`,
      });
    }

    console.log("\n=== [KAF 4B] Menjalankan Audit Kualitas, Arsitektur & Design System via sol (Auto-Fix) ===");
    const moduleFiles = collectModuleFiles(slug);
    if (moduleFiles.length > 0) {
      const modified = run9Router({
        role: "sol",
        system:
          "Kamu adalah Principal Code Reviewer & Design System Auditor untuk SIAKAD Univet Bantara. Audit berkas kode terlampir terhadap review-checklist.md, bundle-format-rules.md, dan docs/UI/design_system.md. Jika ada pelanggaran sekecil apa pun (seperti tombol merah dengan teks merah, warna hex #... langsung di komponen, tidak memakai 2-column split-view sesuai wireframe spec, ada tipe any/TODO/emoji, atau pelanggaran 7 Pilar Backend), LANGSUNG TULIS ULANG HANYA FILE YANG PERLU DIPERBAIKI secara utuh di dalam blok === FILE: <path> ===. Jika 100% patuh tanpa cela, cukup tuliskan tepat satu baris: LULUS_AUDIT_TANPA_PERBAIKAN.",
        prompt: `Audit dan perbaiki otomatis (jika ada pelanggaran) berkas modul "${slug}" berikut agar 100% patuh pada Design System Univet v3.0 dan standar arsitektur.`,
        files: [rulesFile, reviewChecklistFile, designFile, specPath, ...moduleFiles],
        out: `docs/specs/.bundle-audit-${slug}.txt`,
        allowEmptyBundle: true,
      });

      if (modified) {
        console.log("[KAF 4B] Perbaikan hasil audit telah diterapkan. Memvalidasi ulang dengan npx tsc --noEmit...");
        const postCheck = runTypeCheck();
        if (!postCheck.ok) {
          console.log("[KAF 4B] Memperbaiki error tipe pasca-audit...");
          run9Router({
            role: "sol",
            system:
              "Kamu adalah Principal TypeScript Debugger. Perbaiki error kompilasi TypeScript berikut dan kembalikan file secara utuh di dalam blok === FILE: <path> ===.",
            prompt: `Perbaiki error tsc --noEmit berikut:\n\n${postCheck.output}`,
            files: [rulesFile, ...moduleFiles],
            out: `docs/specs/.bundle-postaudit-fix-${slug}.txt`,
          });
        }
      }
    }

    try {
      execSync(`git add . && git commit -m "feat(${slug}): complete automated SDLC stage 3 & 4" --allow-empty`, {
        stdio: "inherit",
      });
    } catch (err) {
      console.warn("[Git] Peringatan auto-commit:", err.message);
    }
  }

  console.log(`\n[kaf-code] SELESAI untuk modul "${slug}" (Slice: ${slice}).`);
}

main().catch((err) => {
  console.error("[kaf-code Fatal Error]:", err.message);
  process.exit(1);
});
