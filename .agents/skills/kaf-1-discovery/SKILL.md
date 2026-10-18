---
name: kaf-1-discovery
description: >-
  Jalankan Tahap 1 (Discovery & Proses Bisnis) dari Multi-Model KAF Workflow.
  Gunakan skill ini saat developer meminta memulai analisis fitur/modul baru. Sumbernya sesuai
  discovery.source di kaf.config.json: wawancara pilihan ganda, HTML hasil scrape, atau dokumen.
  Hasilnya dokumen proses bisnis bahasa manusia, sequence diagram per peran, dan pilihan ganda keputusan.
---

# KAF Tahap 1: Discovery & Proses Bisnis (`kaf-1-discovery`)

Menghasilkan `docs/discovery/<slug>.md`: **proses bisnis 100% bahasa manusia (non-programmer)**, singkat, padat,
dan mudah dipahami siapa saja.

## 4 Aturan Mutlak Dokumen Discovery
1. **Sequence diagram per peran:** Mermaid `sequenceDiagram` (`autonumber`), setiap kolom adalah peran, bukan halaman.
2. **Alur proses bisnis hulu → hilir,** bukan mengabsen isi layar/file satu per satu.
3. **Nol jargon teknis:** DILARANG nama file, nama kolom/tabel, nama fungsi, atau istilah seperti DOM, AJAX, POST, base64.
   Tulis "Judul wajib diisi maksimal 120 karakter", bukan "field `title` maxlength=120".
4. **Pokok-pokok saja:** kalimat pendek, langsung ke inti.

---

## Langkah 0: Baca Profil
Baca `kaf.config.json` (kecil): `project` (nama & tujuan), `discovery.source`, `discovery.path`, `models.discovery`, `auth.mode`.

## Langkah 1: Siapkan Konteks Sesuai Sumber
Semua sumber berakhir di satu file konteks sementara `docs/discovery/.context-<slug>.txt`.

### A. `interview` — Wawancara Pilihan Ganda (fitur baru, tanpa dokumen)
Ajukan pertanyaan **pilihan ganda** ke developer (tool `ask_question` atau sejenisnya; selalu sediakan opsi "lainnya"),
maksimal **3 putaran × 4 pertanyaan**, berhenti lebih awal jika sudah cukup:
1. **Tujuan & lingkup:** masalah apa yang diselesaikan, siapa penggunanya, apa yang TIDAK termasuk.
2. **Alur utama:** langkah dari awal sampai selesai, status apa saja yang dilalui sebuah item.
3. **Aturan & data:** batasan (wajib isi, batas jumlah, siapa boleh apa), data apa yang dicatat, laporan yang dibutuhkan.

Tulis jawaban apa adanya ke `docs/discovery/.context-<slug>.txt` sebagai poin singkat berjudul
`FAKTA DARI DEVELOPER`. **Jangan menambah asumsi**; hal yang belum dijawab tulis sebagai `BELUM DIJAWAB: ...`.

### B. `scrape` — HTML Hasil Scrape Sistem Lama
Pilih file HTML relevan di `discovery.path` dengan `ls`/`find` (jangan dibuka mentah), lalu:
```bash
node .agents/skills/kaf-1-discovery/scripts/extract-context.mjs \
  --html "<path1.html>,<path2.html>" \
  --out "docs/discovery/.context-<slug>.txt"
```

### C. `docs` — Dokumen (.md / .txt)
```bash
node .agents/skills/kaf-1-discovery/scripts/extract-context.mjs \
  --docs "<discovery.path atau subfolder yang relevan>" \
  --out "docs/discovery/.context-<slug>.txt"
```
*(PDF/Word ubah dulu ke .md/.txt; file data besar seperti CSV jangan dimasukkan.)*

## Langkah 2: Delegasikan Penyusunan ke `9router`
Ganti `<role>` dengan `models.discovery` (bawaan `flash`):

```bash
node scripts/9router.mjs \
  --role <role> \
  --system "Kamu adalah Business Process Analyst. Terjemahkan sumber terlampir menjadi dokumen Proses Bisnis untuk manusia NON-PROGRAMMER. ATURAN KERAS: (1) DILARANG nama file, nama kolom/tabel/variabel, nama fungsi, atau istilah teknis. (2) Bahasa awam, singkat, to the point. (3) Mermaid sequenceDiagram (autonumber) dengan kolom per Peran. (4) Alur hulu ke hilir. (5) Hanya gunakan fakta dari sumber; yang belum jelas tandai [perlu dicek manual]." \
  --prompt "Olah sumber terlampir menjadi dokumen Proses Bisnis [<NAMA FITUR>] untuk proyek di kaf.config.json, mengikuti struktur discovery-template.md. Tandai hal yang belum jelas, rangkum kelemahan cara lama vs praktik terbaik (jika ada), dan tutup dengan 4–6 pertanyaan Pilihan Ganda keputusan (Bagian 8). Biarkan Bagian 9 kosong." \
  --files "kaf.config.json,.agents/skills/kaf-1-discovery/resources/discovery-template.md,docs/discovery/.context-<slug>.txt" \
  --out "docs/discovery/<slug>.md"
```
*(Jalankan dengan `BypassSandbox: true` jika localhost `9router` diblokir sandbox. Hapus `docs/discovery/.context-<slug>.txt`
setelah selesai.)*

## Langkah 3: Gate 1 — Pilihan Ganda Keputusan
1. Berikan link `docs/discovery/<slug>.md` kepada developer.
2. Ajukan pertanyaan Bagian 8 sebagai **pilihan ganda** interaktif.
3. Tulis jawaban di **Bagian 9 — Keputusan Final (Terkunci — Gate 1)**, satu baris per keputusan, lalu **STOP** menunggu
   instruksi lanjut ke Tahap 2.
