---
name: kaf-2-spec
description: >-
  Jalankan Tahap 2 (Unified Tech Spec: PRD + UI + DB Schema + Kontrak Action) dari
  Multi-Model KAF Workflow. Gunakan skill ini setelah dokumen Discovery (Tahap 1) memiliki
  Keputusan Final Gate 1, dengan mendelegasikan penyusunan docs/specs/<fitur>.md ke model
  spec di 9router (models.spec di kaf.config.json).
---

# KAF Tahap 2: Unified Tech Spec (`kaf-2-spec`)

Mengubah dokumen proses bisnis & Keputusan Gate 1 (`docs/discovery/<slug>.md`) menjadi **1 dokumen spesifikasi
teknis (`docs/specs/<slug>.md`)** memakai model `models.spec` dari `kaf.config.json` (bawaan `sol`).

## Aturan Mutlak Penulisan Tech Spec
1. **Padat, Teknis, To-The-Point** untuk programmer & AI coder: tabel, skema `prisma`, poin tajam.
2. **Patuh 100% pada Keputusan Gate 1** di `docs/discovery/<slug>.md`.
3. **Sesuai profil proyek** (`kaf.config.json`): stack, library UI, mode login (`auth.mode`), design system, bahasa.
4. **Wajib memuat 9 Kontrak UI & 7 Pilar Backend** seperti di [spec-template.md](./resources/spec-template.md).
5. **Mandiri untuk diuji:** data seed secukupnya; bila `auth.mode = demo` sertakan peran & akun Role Switcher dari `auth.roles`.
6. **Anti Over-Engineering & Checklist Bertahap:**
   - Tabel dan Server Actions **seramping mungkin** (tanpa cron/worker, custom crypto, atau abstraction layer yang tidak perlu).
   - **Struktur file mengikuti `bundle-format-rules.md` §4:** actions per peran/area, komponen per area, **maks `maxLines` baris per file**,
     rute halaman = `/<slug>`. Lebih baik 10 file kecil daripada 2 file raksasa.
   - **Schema bersama:** hanya rancang model BARU; model yang sudah ada di `prisma/schema.prisma` cukup direferensikan.
   - Bagian 6 wajib berupa tabel Checklist Task (`T3A.x`, `T3B.x`, `T3C.x`) untuk Pause & Resume.
7. **WAJIB BERHENTI di Gate 2.**

---

## Langkah Eksekusi

### Langkah 1: Pastikan Gate 1 Sudah Terkunci
`docs/discovery/<slug>.md` harus sudah memiliki bagian **Keputusan Final (Terkunci — Gate 1)**.

### Langkah 2: Delegasikan ke `9router`
Ganti `<role>` dengan `models.spec` dan `<design-system>` dengan `designSystem` dari `kaf.config.json`:

```bash
node scripts/9router.mjs \
  --role <role> \
  --system "Kamu adalah Principal Fullstack Architect. Rancang sesuai profil di kaf.config.json (stack, UI, mode login, bahasa). Prinsip utama: KISS & YAGNI dan patuh 100% pada design system proyek." \
  --prompt "Susun Unified Tech Spec untuk [<NAMA FITUR>] berdasarkan dokumen proses bisnis & Keputusan Final Gate 1 terlampir, mengikuti struktur persis spec-template.md. Pastikan: (1) peran & skenario uji sesuai auth.mode, (2) halaman & komponen sesuai stack.ui dan design system beserta 9 Kontrak UI, (3) 7 Pilar Backend + aturan spesifik Gate 1 tanpa over-engineering, (4) ERD + HANYA model baru (prisma/schema.prisma terlampir adalah schema bersama; model lama cukup direferensikan) + data uji seeder, (5) kontrak Server Actions ringkas beserta aturan yang akan dites di scripts/verify-<slug>-backend.ts, (6) Tabel Checklist T3A/T3B/T3C dengan File Target sesuai bundle-format-rules.md §4 (rute /<slug>, maks maxLines baris/file, tabel database lazy)." \
  --files "kaf.config.json,.agents/skills/kaf-2-spec/resources/spec-template.md,.agents/skills/kaf-3-coding/resources/bundle-format-rules.md,<design-system>,docs/discovery/<slug>.md,prisma/schema.prisma" \
  --out "docs/specs/<slug>.md"
```
*(File yang belum ada, mis. `prisma/schema.prisma` di proyek baru, dilewati otomatis. Jalankan dengan `BypassSandbox: true`
jika koneksi localhost `9router` diblokir sandbox.)*

### Langkah 3: Gate 2 — Review & Approval Developer
1. Tampilkan link `docs/specs/<slug>.md` kepada developer dan minta review.
2. Setelah developer setuju, ubah baris status menjadi `> **Status:** ✅ Disetujui & Terkunci oleh Developer (Gate 2)`
   — `kaf-code.mjs` menolak spec yang belum berstatus ini.
3. **STOP.** Tunggu approval sebelum Tahap 3.
