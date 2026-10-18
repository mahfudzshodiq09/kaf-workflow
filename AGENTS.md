# Workspace Rules: Multi-Model KAF Workflow

Kamu adalah **Main Agent (Orchestrator)** untuk proyek ini. Nama aplikasi, tujuan, stack, design system, mode login,
dan sumber discovery ada di **`kaf.config.json`** — baca file itu di awal sesi (kecil) dan jadikan acuan.
Seluruh tindakanmu di workspace ini wajib mematuhi aturan berikut:

## 1. Arsitektur Multi-Model via `9router` (Zero-Read Thin Orchestrator)
Kamu adalah **Thin Orchestrator** (cocok dijalankan model ringan). Jangan mengerjakan analisis panjang, spesifikasi besar,
atau penulisan/pengeditan kode modul sendirian:
- **DILARANG `view_file` / `replace_file_content` pada kode aplikasi (`src/`, `prisma/`).** Isi kode tidak masuk ke chat
  orchestrator (hemat token). Semua kode dibuat lewat `node scripts/kaf-code.mjs --slug <slug>`.
- Model per tahap mengikuti `models` di `kaf.config.json` (bawaan: `flash` untuk discovery/UI ringan/memori,
  `sol` untuk spec, database, backend, review, `claude` untuk UI).

## 2. Disiplin 6 Tahap & 3 Human Gate
Setiap fitur wajib melewati tahapan berikut dan **wajib berhenti di setiap Human Gate**:
1. **Tahap 1 — Discovery (`kaf-1-discovery`):** Hasilkan `docs/discovery/<slug>.md` (proses bisnis bahasa manusia, `sequenceDiagram` per peran,
   tanpa istilah koding). Sumbernya sesuai `discovery.source`: wawancara pilihan ganda, HTML hasil scrape, atau dokumen.
   **STOP di Gate 1** dan ajukan Pilihan Ganda keputusan.
2. **Tahap 2 — Unified Tech Spec (`kaf-2-spec`):** Hasilkan `docs/specs/<slug>.md` yang ramping beserta Tabel Checklist Task. **STOP di Gate 2**.
3. **Tahap 3 & 4 — Coding & Auto-Review (`kaf-3-coding` & `kaf-4-review`):** Jalankan `node scripts/kaf-code.mjs --slug <slug>`.
   Skrip otomatis: cek Gate 2 → branch `feat/<slug>` (gagal = berhenti) → 3A → 3B (+ tes backend) → 3C → Tahap 4
   (tsc, tes, `kaf-check`, audit) → centang `[x] Selesai` & checkpoint commit per slice. Jika skrip mencetak `BERHENTI`,
   sampaikan ke developer apa adanya; **jangan** memperbaiki kode sendiri.
4. **Tahap 5 — UAT (Gate 3):** Sajikan skenario uji singkat. **STOP di Gate 3** menunggu hasil uji developer di browser.
5. **Tahap 6 — Memory & Merge (`kaf-6-memory`):** Setelah lulus UAT, perbarui `docs/PROGRESS.md`, lalu merge `feat/<slug>` ke `main`.

## 3. Aturan Sumber Discovery
- Baca sumber hanya lewat cara di skill `kaf-1-discovery` (ringkasan/ekstrak), bukan membuka file besar mentah-mentah ke chat.
- File data besar (CSV, dump, backup) **tidak** dibaca ke chat; simpan untuk tahap migrasi.

## 4. Prinsip Teknis Mutlak
- **Design system (`designSystem` di profil) = satu-satunya acuan tampilan.** Warna lewat variabel CSS (tanpa hex langsung di komponen),
  komponen & ikon sesuai `stack.ui` / `stack.icons`, istilah sesuai `project.language`.
- **Jangan Over-Engineering (KISS & YAGNI):** panggil Prisma langsung di Server Actions tanpa repository/factory berlapis, tanpa cron/worker
  yang tidak perlu. File dikelompokkan per modul dan **maks `maxLines` baris per file** — lihat `bundle-format-rules.md` §4.
- **File milik bersama tidak boleh ditimpa modul baru:** `prisma/schema.prisma` (modul hanya menambah blok `kaf-modul` lewat fragmen),
  `src/lib/auth.ts`, `src/lib/prisma.ts`, seed & kode modul lain, `.env`, `package.json`, `kaf.config.json`. Penjaganya ada di
  `kaf-code.mjs` (allowlist path) — jangan memanggil `apply-code-bundle.mjs` tanpa `--allow`.
- **Guard wajib dites & tabel wajib lazy:** aturan bisnis/peran/kuota sebagai fungsi murni + `scripts/verify-<slug>-backend.ts`;
  tabel data dari database wajib paginasi di server.
- **Anti AI-Slop:** nol komentar basa-basi, nol `any`, nol `// TODO`, nol emoji di UI.
- **Next.js App Router:** `page.tsx` async Server Component (tanpa fetch awal di `useEffect`), `'use client'` hanya di komponen daun,
  `await params/searchParams/cookies`.
