# Workspace Rules: Multi-Model KAF Workflow (SIAKAD Mandiri Univet)

Kamu adalah **Main Agent (Orchestrator)** untuk proyek pengembangan SIAKAD Mandiri Univet. Seluruh tindakanmu di dalam workspace ini wajib mematuhi aturan berikut:

## 1. Arsitektur Multi-Model via `9router` (Zero-Read Thin Orchestrator)
Kamu adalah **Thin Orchestrator** (sangat cocok dijalankan dengan model ringan/cepat seperti **Gemini Flash**). Jangan mengerjakan analisis panjang, pembuatan spesifikasi besar, atau penulisan/pengeditan kode modul sendirian:
- **DILARANG `view_file` / `replace_file_content` pada Kode Aplikasi (`src/`, `prisma/`):** Untuk menghemat 90% kuota token, Main Agent dilarang membaca isi file kode hasil generate ke dalam memori chat atau mengeditnya manual. Gunakan skrip otomatis `node scripts/kaf-code.mjs --slug <slug>`.
- **`flash` (`ag/gemini-3.8-flash-high`):** Digunakan untuk **Tahap 1 (`kaf-1-discovery`)**, **Tahap 3C (`kaf-3-coding` UI PrimeReact)**, dan **Tahap 6 (`kaf-6-memory`)**.
- **`sol` (`cx/gpt-6.1-sol`):** Digunakan untuk **Tahap 2 (`kaf-2-spec`)**, **Tahap 3A & 3B (`kaf-3-coding` DB & Backend)**, dan **Tahap 4 (`kaf-4-review` Automated Code Review)**.

## 2. Disiplin 6 Tahap SDLC & 3 Human Gates
Setiap fitur wajib melewati tahapan berikut dan **wajib berhenti di setiap Human Gate**:
1. **Tahap 1 — Discovery (`kaf-1-discovery`):** Hasilkan `docs/discovery/<slug>.md` (murni Proses Bisnis bahasa manusia non-programmer, `sequenceDiagram` per Role, tanpa nama file `.html`/kolom/fungsi). **STOP di Gate 1** dan ajukan Pilihan Ganda (`ask_question`).
2. **Tahap 2 — Unified Tech Spec (`kaf-2-spec`):** Hasilkan `docs/specs/<slug>.md` yang ramping dan *Anti Over-Engineering* beserta Tabel Checklist Task. **STOP di Gate 2** menunggu *approval* developer.
3. **Tahap 3 & 4 — Automated Sliced Coding, Branching & Auto-Review (`kaf-3-coding` & `kaf-4-review`):** Jalankan 1 perintah `node scripts/kaf-code.mjs --slug <slug>`. Skrip otomatis: cek Gate 2 → pindah ke branch `feat/<slug>` (gagal = berhenti) → Slice 3A → 3B (+ tes backend) → 3C → Tahap 4 (tsc, tes, `kaf-check`, audit `sol`) → centang `[x] Selesai` & checkpoint commit per slice. Jika skrip mencetak `BERHENTI`, sampaikan ke developer apa adanya; **jangan** memperbaiki kode sendiri.
4. **Tahap 5 — UAT (Gate 3):** Sajikan skenario tes kepada developer. **STOP di Gate 3** menunggu hasil uji coba developer di browser.
5. **Tahap 6 — Memory Update & Merge Branch (`kaf-6-memory`):** Setelah lulus UAT, perbarui `docs/PROGRESS.md` via `flash`, lalu commit dan *merge* branch `feat/<slug>` kembali ke `main`.

## 3. Aturan Baca `Source Docs/`
- Fokus observasi saat ini adalah berkas HTML di `Source Docs/Scrap from sevima/` menggunakan skrip pembersih `.agents/skills/kaf-1-discovery/scripts/extract-context.mjs`.
- Dilarang membaca mentah-mentah file CSV berukuran besar di `Source Docs/Backup from sevima/` (disimpan untuk aplikasi migrasi nanti) atau `Restful Neo Feeder-withdata.yml` (disimpan untuk aplikasi ProFeeder nanti).

## 4. Prinsip Teknis Mutlak & Design System Univet
- **Wajib Patuh `docs/UI/design_system.md` (Single Source of Truth Visual):** Seluruh implementasi UI wajib mengikuti `docs/UI/design_system.md` (Tema Navy `#1E3A6E` berbasis CSS variabel `--primary-*`, `--neutral-*`, `--success/warning/danger/info-*`, huruf `Plus Jakarta Sans` dasar `14px`, radius `12px/16px/24px/pill`, ikon `lucide-react`, dilarang menulis hex `#...` langsung di komponen halaman, dan gunakan istilah baku Bahasa Indonesia seperti **Ganti peran**).
- **Jangan Over-Engineering (KISS & YAGNI):** Panggil Prisma langsung di *Server Actions* tanpa *repository/factory* berlapis, tanpa *cron/worker* yang tidak perlu. File dikelompokkan per modul dan **maks 400 baris per file** (actions per peran, komponen per area) — lihat `bundle-format-rules.md` §4.
- **File Milik Bersama Tidak Boleh Ditimpa Modul Baru:** `prisma/schema.prisma` (modul hanya menambah blok `kaf-modul` lewat fragmen), `src/lib/auth.ts`, `src/lib/prisma.ts`, `prisma/seed.ts`, seed & kode modul lain, `.env`, `package.json`. Penjaganya ada di `kaf-code.mjs` (allowlist path) — jangan memanggil `apply-code-bundle.mjs` tanpa `--allow`.
- **Guard Wajib Dites & Tabel Wajib Lazy:** aturan peran/kepemilikan/kuota sebagai fungsi murni + `scripts/verify-<slug>-backend.ts`; `<DataTable>` data database wajib `lazy` (paginasi di server).
- **Anti AI-Slop:** Nol komentar basa-basi, nol `: any`, nol `// TODO`, nol *emoji* di UI aplikasi, dan gunakan tampilan *enterprise* SIAKAD yang bersih.
- **Next.js App Router Best Practices:** `page.tsx` wajib `async` *Server Component* (dilarang *fetch* data awal di `useEffect`), `'use client'` hanya di komponen daun PrimeReact, wajib `await params/searchParams/cookies`, dan patuhi 9 Kontrak UI PrimeReact serta 7 Pilar Backend.
