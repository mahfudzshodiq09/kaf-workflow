---
name: kaf-1-discovery
description: >-
  Jalankan Tahap 1 (Discovery & Proses Bisnis) dari Multi-Model KAF Workflow.
  Gunakan skill ini saat developer meminta memulai analisis/riset fitur atau modul dari hasil
  scrape HTML Sevima dalam bentuk Proses Bisnis (Probis) bahasa manusia awam, Swimlane Diagram
  per Role, dan Pilihan Ganda keputusan desain.
---

# KAF Tahap 1: Discovery & Proses Bisnis (`kaf-1-discovery`)

Skill ini mengatur langkah kerja **Orchestrator** pada **Tahap 1** dari KAF Workflow.
Tujuan utamanya adalah mengolah berkas HTML hasil scrape SEVIMA menjadi **dokumen Proses Bisnis (Probis)** di `docs/discovery/<slug-fitur>.md` yang **100% menggunakan bahasa manusia (non-programmer)**, singkat, padat (*to-the-point*), dan mudah dipahami siapa saja.

## 4 Aturan Mutlak Penulisan Dokumen Discovery
1. **Sequence Diagram per Peran (Role):** Diagram Mermaid wajib menggunakan `sequenceDiagram` (`autonumber`) di mana setiap kolom (`actor` / `participant`) adalah **Peran/Aktor** (misal: *Admin Akademik*, *Keuangan*, *Mahasiswa*, *Dosen Wali*), bukan halaman HTML.
2. **Alur Murni Proses Bisnis (Bukan Per Halaman HTML):** Narasi alur kerja harus disusun mengikuti urutan proses bisnis nyata dari awal hingga akhir (hulu ke hilir), bukan mengabsen isi file HTML satu per satu.
3. **Nol Jargon Teknis / Koding (Bahasa Manusia Non-Programmer):**
   - **DILARANG KERAS** menuliskan nama file (`list_mhspa.html`, `set_cekal.html`), nama kolom/atribut (`idperiode`, `no_sk`, `maxlength`), nama fungsi (`goSubmit()`, `ifToggled`), atau istilah teknis (`DOM`, `AJAX`, `POST`, `base64`, `iframe`) di dalam dokumen!
   - Terjemahkan semuanya ke bahasa manusia sehari-hari (contoh: tulis *"Nomor SK maksimal 80 karakter"*, bukan *"field `no_sk` dengan `maxlength=80`"*; tulis *"setiap centang langsung tersimpan otomatis"*, bukan *"event `ifToggled` memicu AJAX `goSubmit`"*).
4. **Pokok-Pokok Saja (To-The-Point):** Gunakan kalimat pendek, poin-poin langsung ke inti masalah, jangan bertele-tele atau berbunga-bunga.

---

## Langkah Eksekusi Step-by-Step

### Langkah 1: Identifikasi Berkas HTML di `Source Docs/Scrap from sevima/`
Gunakan perintah ringan (`ls` atau `find`) untuk memilih berkas HTML yang relevan dengan modul/fitur yang diminta.

### Langkah 2: Siapkan Konteks HTML Bersih
Jalankan skrip [extract-context.mjs](./scripts/extract-context.mjs) untuk menghasilkan file konteks sementara:

```bash
node .agents/skills/kaf-1-discovery/scripts/extract-context.mjs \
  --html "<path1.html>,<path2.html>" \
  --out "docs/discovery/.context-<slug>.txt"
```

### Langkah 3: Delegasikan Penyusunan Probis ke `9router` (`flash`)
Kirim konteks HTML dan template [discovery-template.md](./resources/discovery-template.md) ke model **`ag/gemini-3.8-flash-high`** melalui `scripts/9router.mjs`:

```bash
node scripts/9router.mjs \
  --role flash \
  --system "Kamu adalah Business Process Analyst Perguruan Tinggi. Tugasmu adalah menerjemahkan temuan dari layar aplikasi menjadi dokumen Proses Bisnis (Probis) untuk manusia NON-PROGRAMMER. ATURAN KERAS: (1) DILARANG KERAS menulis nama file .html, nama variabel/kolom kode, nama fungsi JS, atau istilah teknis seperti AJAX, DOM, POST, iframe, base64, maxlength di seluruh isi dokumen. (2) Gunakan 100% bahasa manusia awam yang singkat, padat, langsung ke pokok-pokoknya saja (to the point, tidak bertele-tele). (3) Buat Sequence Diagram menggunakan Mermaid sequenceDiagram (autonumber) dengan kolom actor per Peran (Role). (4) Susun alur berdasarkan urutan proses bisnis dari hulu ke hilir, bukan per halaman HTML." \
  --prompt "Olahlah berkas referensi terlampir menjadi dokumen Proses Bisnis [<NAMA FITUR>] dengan mengikuti struktur pada discovery-template.md. Pastikan poin-poinnya padat, to-the-point, bebas istilah koding/nama file HTML, memiliki Sequence Diagram per Peran (Role), menandai hal yang belum terlihat dengan [perlu dicek manual] atau [tidak ada di scrape], merangkum kelemahan sistem lama vs standar terbaik (best practice) luar, dan menutup dengan pertanyaan Pilihan Ganda untuk pengambil keputusan." \
  --files ".agents/skills/kaf-1-discovery/resources/discovery-template.md,docs/discovery/.context-<slug>.txt" \
  --out "docs/discovery/<slug>.md"
```

*(Jalankan dengan `BypassSandbox: true` jika localhost `9router` diblokir oleh sandbox, lalu hapus `docs/discovery/.context-<slug>.txt` setelah selesai).*

### Langkah 4: Gate 1 — Tampilkan Dokumen & Ajukan Pilihan Ganda Interaktif (`ask_question`)
1. Berikan link klik-able `[docs/discovery/<slug>.md](file:///.../docs/discovery/<slug>.md)` kepada developer.
2. Panggil tool `ask_question` untuk mengajukan pertanyaan keputusan proses bisnis dalam bentuk **Pilihan Ganda**.
3. Setelah dijawab, catat keputusan tersebut di bagian akhir `docs/discovery/<slug>.md` dan **STOP** menunggu instruksi lanjut ke Tahap 2.
