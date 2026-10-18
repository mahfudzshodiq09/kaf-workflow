#!/usr/bin/env node
/**
 * Helper Unpacker untuk Tahap 3 (Sliced Implementation)
 * Mengekstrak multi-file code bundle yang dihasilkan oleh model di 9router
 * (format: === FILE: path/to/file === ... === END FILE: path/to/file ===)
 * dan langsung menuliskannya ke dalam struktur folder proyek secara aman.
 *
 * Cara pakai:
 *   node .agents/skills/kaf-3-coding/scripts/apply-code-bundle.mjs --in "docs/specs/.bundle-3a.txt"
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { inFile: '', dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') args.inFile = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

function cleanCodeBlock(content) {
  let trimmed = content.trim();
  // Jika model masih membungkus dengan ```ts ... ``` di dalam blok FILE, kupas fence luarnya
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n```$/);
  if (fenceMatch) {
    trimmed = fenceMatch[1];
  }
  return trimmed + '\n';
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.inFile) {
    console.error('Error: Gunakan --in "<path-bundle-file>"');
    process.exit(1);
  }

  const bundlePath = path.resolve(process.cwd(), args.inFile);
  if (!fs.existsSync(bundlePath)) {
    console.error(`Error: File bundle tidak ditemukan: ${bundlePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(bundlePath, 'utf-8');
  const fileRegex = /===\s*FILE:\s*([^\r\n=]+?)\s*===\r?\n([\s\S]*?)===\s*END FILE(?:\s*:\s*[^\r\n=]+?)?\s*===/g;

  let match;
  let count = 0;
  const workspaceRoot = process.cwd();

  while ((match = fileRegex.exec(raw)) !== null) {
    const relPath = match[1].trim().replace(/^\/+/, '');
    const codeContent = cleanCodeBlock(match[2]);
    const targetPath = path.resolve(workspaceRoot, relPath);

    // Keamanan: pastikan targetPath tetap berada di dalam workspaceRoot
    if (!targetPath.startsWith(workspaceRoot + path.sep)) {
      console.error(`[SKIP] Path di luar workspace ditolak: ${relPath}`);
      continue;
    }

    if (args.dryRun) {
      console.log(`[DRY-RUN] Akan menulis: ${relPath} (${codeContent.length} bytes)`);
    } else {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, codeContent, 'utf-8');
      console.log(`[APPLIED] ${relPath} (${codeContent.length} bytes)`);
    }
    count++;
  }

  if (count === 0) {
    console.error('Error: Tidak ditemukan blok === FILE: <path> === di dalam bundle output.');
    process.exit(1);
  }

  console.log(`\n[apply-code-bundle] Selesai! Total ${count} file berhasil ditulis.`);
}

main();
