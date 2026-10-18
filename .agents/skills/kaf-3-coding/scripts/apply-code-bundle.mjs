#!/usr/bin/env node
/**
 * Unpacker multi-file bundle hasil model (format === FILE: path === ... === END FILE: path ===).
 *
 * Prinsip: SEMUA ATAU TIDAK SAMA SEKALI. Bundle diperiksa utuh dulu; kalau ada satu masalah
 * (path terlarang, blok terpotong, file kebesaran), tidak ada satu file pun yang ditulis.
 *
 * Cara pakai:
 *   node .agents/skills/kaf-3-coding/scripts/apply-code-bundle.mjs --in <bundle.txt>
 *     [--allow "src/actions/krs/**,src/lib/validations/krs.ts"]   path yang boleh ditulis
 *     [--max-lines 400]                                          batas baris file .ts/.tsx di src/ (0 = mati)
 *     [--dry-run]
 *
 * Exit code: 0 OK · 1 argumen/tidak ada blok · 2 path ditolak · 3 bundle terpotong · 4 file kebesaran
 * Setiap kegagalan mencetak baris "KAF_BUNDLE_ERROR: ..." yang dipakai kaf-code.mjs sebagai umpan balik ke model.
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { inFile: '', dryRun: false, allow: [], maxLines: 400 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') args.inFile = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--allow') args.allow = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--max-lines') args.maxLines = Number(argv[++i]);
  }
  return args;
}

function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*';
      i++;
      if (glob[i + 1] === '/') i++;
    } else if (c === '*') re += '[^/]*';
    else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

function cleanCodeBlock(content) {
  let trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n```$/);
  if (fenceMatch) trimmed = fenceMatch[1];
  return trimmed + '\n';
}

function die(code, message) {
  console.error(`KAF_BUNDLE_ERROR: ${message}`);
  process.exit(code);
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.inFile) die(1, 'Gunakan --in "<path-bundle-file>"');

  const bundlePath = path.resolve(process.cwd(), args.inFile);
  if (!fs.existsSync(bundlePath)) die(1, `File bundle tidak ditemukan: ${args.inFile}`);

  const raw = fs.readFileSync(bundlePath, 'utf-8');
  const headerCount = (raw.match(/^===\s*FILE:/gm) || []).length;
  const fileRegex = /^===\s*FILE:\s*([^\r\n=]+?)\s*===\r?\n([\s\S]*?)^===\s*END FILE(?:\s*:\s*([^\r\n=]+?))?\s*===/gm;

  const files = [];
  let match;
  while ((match = fileRegex.exec(raw)) !== null) {
    const relPath = match[1].trim().replace(/^\/+/, '');
    const endPath = match[3]?.trim().replace(/^\/+/, '');
    if (/^===\s*FILE:/m.test(match[2])) {
      die(3, `Blok ${relPath} tidak ditutup END FILE sebelum blok berikutnya dimulai (output terpotong/rusak).`);
    }
    if (endPath && endPath !== relPath) {
      die(3, `Blok ${relPath} ditutup dengan END FILE untuk ${endPath} (output rusak).`);
    }
    files.push({ relPath, content: cleanCodeBlock(match[2]) });
  }

  if (headerCount === 0) die(1, 'Tidak ditemukan blok === FILE: <path> === di dalam output model.');
  if (files.length !== headerCount) {
    die(3, `Output terpotong: ada ${headerCount} header FILE tetapi hanya ${files.length} yang ditutup END FILE.`);
  }

  const workspaceRoot = process.cwd();
  const allowRes = args.allow.map(globToRegex);
  const rejected = [];
  const oversized = [];

  for (const f of files) {
    const targetPath = path.resolve(workspaceRoot, f.relPath);
    if (!targetPath.startsWith(workspaceRoot + path.sep)) {
      rejected.push(`${f.relPath} (di luar workspace)`);
      continue;
    }
    const rel = path.relative(workspaceRoot, targetPath).split(path.sep).join('/');
    f.relPath = rel;
    f.targetPath = targetPath;
    if (allowRes.length > 0 && !allowRes.some((re) => re.test(rel))) {
      rejected.push(`${rel} (bukan path milik tahap ini)`);
    }
    const lines = f.content.split('\n').length - 1;
    if (args.maxLines > 0 && rel.startsWith('src/') && /\.(ts|tsx)$/.test(rel) && lines > args.maxLines) {
      oversized.push(`${rel} (${lines} baris > ${args.maxLines})`);
    }
  }

  if (rejected.length > 0) {
    die(2, `Path ditolak: ${rejected.join('; ')}. Path yang boleh: ${args.allow.join(', ') || '-'}`);
  }
  if (oversized.length > 0) {
    die(4, `File terlalu besar: ${oversized.join('; ')}. Pecah menjadi beberapa file kecil per peran/area.`);
  }

  for (const f of files) {
    if (args.dryRun) {
      console.log(`[DRY-RUN] Akan menulis: ${f.relPath} (${f.content.length} bytes)`);
    } else {
      fs.mkdirSync(path.dirname(f.targetPath), { recursive: true });
      fs.writeFileSync(f.targetPath, f.content, 'utf-8');
      console.log(`[APPLIED] ${f.relPath} (${f.content.split('\n').length - 1} baris)`);
    }
  }

  console.log(`\n[apply-code-bundle] Selesai! Total ${files.length} file ditulis.`);
}

main();
