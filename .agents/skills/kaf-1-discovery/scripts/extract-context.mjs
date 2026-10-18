#!/usr/bin/env node
/**
 * Helper Ekstraksi HTML SEVIMA untuk Tahap 1 (Discovery - Format GEMINI)
 * Membersihkan noise visual (CSS, SVG, sidebar berulang 1600 baris di tiap file, base64 panjang)
 * namun MEMPERTAHANKAN 100% isi halaman utama (<aside class="right-side"> s/d akhir file),
 * termasuk struktur lengkap formulir (maxlength, required, name), tabel, modal, tombol,
 * serta inline script logika halaman.
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { dir: '', html: [], out: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') args.dir = argv[++i];
    else if (a === '--html') args.html.push(...argv[++i].split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--out') args.out = argv[++i];
  }
  return args;
}

function cleanHtmlForAnalysis(relPath) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) return `[Berkas tidak ditemukan: ${relPath}]`;

  let raw = fs.readFileSync(fullPath, 'utf-8');

  // Ambil <title>
  const titleMatch = raw.match(/<title>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : '';

  // Ambil variabel global halaman (g_page, dll.) jika ada di <head>
  const gPageMatch = raw.match(/var\s+g_page\s*=\s*["']([^"']+)["']/i);
  const gPage = gPageMatch ? gPageMatch[1] : '';

  // Fokus ke konten utama halaman (<aside class="right-side"> sampai akhir dokumen)
  // agar tidak mengulang 1600 baris menu sidebar yang sama di setiap file HTML
  const rightSideIdx = raw.indexOf('<aside class="right-side"');
  if (rightSideIdx !== -1) {
    raw = raw.slice(rightSideIdx);
  }

  // 1. Buang <style>...</style> dan <svg>...</svg>
  raw = raw
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '');

  // 2. Pangkas atribut data-* yang berisi string base64 raksasa (> 150 karakter)
  raw = raw.replace(/(data-[a-z0-9_-]+)=["']([^"']{150,})["']/gi, '$1="[base64_dipangkas]"');

  // 3. Jika ada tabel dengan banyak baris (<tbody>), simpan 5 baris <tr> pertama saja
  raw = raw.replace(/<tbody([^>]*)>([\s\S]*?)<\/tbody>/gi, (match, attrs, inner) => {
    const rows = inner.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    if (rows.length <= 5) return match;
    const kept = rows.slice(0, 5).join('\n');
    return `<tbody${attrs}>\n${kept}\n<!-- [Dipangkas: ${rows.length - 5} baris data tabel lainnya] -->\n</tbody>`;
  });

  // 4. Jika ada <select> dengan > 20 <option>, simpan 10 opsi pertama + jumlah totalnya
  raw = raw.replace(/<select([^>]*)>([\s\S]*?)<\/select>/gi, (match, attrs, inner) => {
    const opts = inner.match(/<option[\s\S]*?<\/option>/gi) || [];
    if (opts.length <= 20) return match;
    const kept = opts.slice(0, 10).join('\n');
    return `<select${attrs}>\n${kept}\n<!-- [Total ${opts.length} opsi; ${opts.length - 10} opsi lainnya dipangkas] -->\n</select>`;
  });

  // 5. Rapikan baris kosong berlebih
  raw = raw.replace(/\n\s*\n\s*\n+/g, '\n\n').trim();

  return [
    `====================================================================`,
    `BERKAS HTML : ${relPath}`,
    `TITLE       : ${pageTitle}`,
    `ROUTE       : ${gPage}`,
    `====================================================================`,
    raw,
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv);
  const filesToProcess = [...args.html];

  if (args.dir) {
    const dirFull = path.resolve(process.cwd(), args.dir);
    if (fs.existsSync(dirFull)) {
      const entries = fs.readdirSync(dirFull);
      for (const entry of entries) {
        if (entry.endsWith('.html') || entry.endsWith('.sh')) {
          filesToProcess.push(path.join(args.dir, entry));
        }
      }
    }
  }

  if (filesToProcess.length === 0) {
    console.error('Error: Gunakan --dir "<folder>" atau --html "<file1,file2>"');
    process.exit(1);
  }

  const results = filesToProcess.map((f) => cleanHtmlForAnalysis(f));
  const finalOutput = results.join('\n\n');

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, finalOutput, 'utf-8');
    console.log(`[extract-context] ${filesToProcess.length} berkas berhasil diekstrak ke: ${args.out} (${(finalOutput.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log(finalOutput);
  }
}

main();
