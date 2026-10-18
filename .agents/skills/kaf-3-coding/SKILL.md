---
name: kaf-3-coding
description: >-
  Jalankan Tahap 3 (Sliced Implementation: 3A Database & Seed, 3B Backend & Zod Logic,
  3C UI PrimeReact) dari Multi-Model KAF Workflow. Gunakan skill ini setelah dokumen
  Tech Spec (docs/specs/<fitur>.md) berstatus Approved di Gate 2.
---

# KAF Tahap 3: Sliced Implementation (`kaf-3-coding`)

Skill ini mengatur langkah kerja **Orchestrator** pada **Tahap 3** dari KAF Workflow.
Eksekusi pembuatan kode dibagi menjadi **3 Irisan Berurutan (Slice 3A $\rightarrow$ 3B $\rightarrow$ 3C)** tanpa *Human Gate* di tengahnya agar alur kerja mulus, menggunakan model di `9router`:
- **Slice 3A (Database & Seed):** Dikerjakan oleh **`sol` (`cx/gpt-6.1-sol`)**
- **Slice 3B (Backend, Zod & Business Logic):** Dikerjakan oleh **`sol` (`cx/gpt-6.1-sol`)**
- **Slice 3C (UI PrimeReact):** Dikerjakan oleh **`flash` (`ag/gemini-3.8-flash-high`)**

Setiap slice menghasilkan *multi-file bundle* yang langsung diekstrak ke dalam workspace menggunakan skrip [apply-code-bundle.mjs](./scripts/apply-code-bundle.mjs).

---

## Aturan Hemat Token Mutlak (Zero-Read Thin Orchestrator)
1. **Gunakan 1 Perintah Runner (`scripts/kaf-code.mjs`):**
   Jangan memanggil `9router.mjs` berkali-kali secara manual dari Main Agent jika ingin menjalankan Tahap 3 & 4. Cukup jalankan:
   ```bash
   # Eksekusi otomatis semua slice yang belum [x] Selesai (3A -> 3B -> 3C -> 4):
   node scripts/kaf-code.mjs --slug <slug>

   # Atau jika developer meminta nyicil 1 slice saja:
   node scripts/kaf-code.mjs --slug <slug> --slice 3A
   ```
2. **DILARANG `view_file` / `replace_file_content` pada File Kode (`src/`, `prisma/`):**
   Main Agent dilarang membaca isi file kode hasil generate ke dalam *context window* chat atau mengeditnya manual. Biarkan `scripts/kaf-code.mjs` yang mengekstrak kode, mencentang `[x] Selesai` di tabel spec, dan meminta `sol` memperbaiki jika ada error `tsc --noEmit`.

---

## Langkah 0: Cek Prasyarat Proyek, Gate 2, & Checklist Task (Pause / Resume)
1. Pastikan `docs/specs/<slug>.md` sudah memiliki status **✅ Disetujui & Terkunci oleh Developer (Gate 2)**.
2. Jalankan `node scripts/kaf-code.mjs --slug <slug>` (otomatis melewati slice yang sudah `[x] Selesai` di tabel Bagian 6 `docs/specs/<slug>.md` dan hanya mengerjakan sisanya).
3. Cek apakah di root proyek sudah ada `package.json` (`T3A.0`). Jika sudah ada, langsung jalankan `scripts/kaf-code.mjs`.

---

## Slice 3A: Database Schema & Seeder (via `cx/gpt-6.1-sol`)

### 1. Delegasikan Pembuatan Kode Slice 3A ke `9router` (`sol`)
```bash
node scripts/9router.mjs \
  --role sol \
  --system "Kamu adalah Senior Database & Prisma Engineer. Patuhi seluruh aturan di bundle-format-rules.md: Jangan Over-Engineering, Anti AI-Slop (nol komentar basa-basi, nol TODO), dan tulis kode 100% lengkap di dalam blok === FILE: <path> ===." \
  --prompt "Implementasikan Slice 3A (Database & Seed) berdasarkan spesifikasi teknis terlampir. Hasilkan file yang ramping dan bersih: (1) prisma/schema.prisma lengkap dan valid, (2) src/lib/prisma.ts singleton client, dan (3) prisma/seed.ts yang ringkas, jelas, dan idempoten untuk skenario uji utama. Ikuti format === FILE: ... === secara ketat." \
  --files ".agents/skills/kaf-3-coding/resources/bundle-format-rules.md,docs/specs/<slug>.md" \
  --out "docs/specs/.bundle-3a.txt"
```

### 2. Terapkan File & Validasi Schema
```bash
node .agents/skills/kaf-3-coding/scripts/apply-code-bundle.mjs --in "docs/specs/.bundle-3a.txt"
rm -f docs/specs/.bundle-3a.txt
npx prisma validate
npx prisma generate
```
*(Jika database PostgreSQL sudah terkoneksi di `.env`, jalankan juga migrasi/push dan seed: `npx prisma db push && npx tsx prisma/seed.ts`).*

---

## Slice 3B: Backend, Zod Validation & Business Logic (via `cx/gpt-6.1-sol`)

### 1. Delegasikan Pembuatan Kode Slice 3B ke `9router` (`sol`)
Kirimkan `docs/specs/<slug>.md` **beserta `prisma/schema.prisma` yang baru saja tervalidasi di Slice 3A** agar nama model/enum 100% sinkron:

```bash
node scripts/9router.mjs \
  --role sol \
  --system "Kamu adalah Principal Backend Engineer (Next.js Server Actions + TypeScript + Prisma + Zod). Patuhi seluruh aturan di bundle-format-rules.md: Jangan Over-Engineering (panggil prisma langsung di Server Action tanpa repository/factory berlapis), Anti AI-Slop (nol any, nol komentar sampah, nol TODO), dan patuhi aturan Next.js App Router (await cookies/params, revalidatePath, konversi Decimal/Date ke plain object)." \
  --prompt "Implementasikan Slice 3B (Backend, Role Switcher, Zod Validation & Server Actions) berdasarkan spesifikasi teknis dan prisma/schema.prisma terlampir. Terapkan ke-7 Pilar Backend secara simpel, lugas, dan tanpa over-engineering. Hasilkan seluruh file Slice 3B dalam format === FILE: ... ===." \
  --files ".agents/skills/kaf-3-coding/resources/bundle-format-rules.md,docs/specs/<slug>.md,prisma/schema.prisma" \
  --out "docs/specs/.bundle-3b.txt"
```

### 2. Terapkan File Slice 3B
```bash
node .agents/skills/kaf-3-coding/scripts/apply-code-bundle.mjs --in "docs/specs/.bundle-3b.txt"
rm -f docs/specs/.bundle-3b.txt
```

---

## Slice 3C: UI PrimeReact Implementation (via `ag/gemini-3.8-flash-high`)

### 1. Delegasikan Pembuatan Kode Slice 3C ke `9router` (`flash`)
Kirimkan `docs/UI/design_system.md`, `docs/specs/<slug>.md`, **beserta file Server Actions & Types hasil Slice 3B** ke model `ag/gemini-3.8-flash-high` agar tampilan 100% patuh Design System Univet dan pemanggilan fungsi cocok dengan backend:

```bash
node scripts/9router.mjs \
  --role flash \
  --system "Kamu adalah Senior Frontend Engineer spesialis Next.js App Router, PrimeReact 10, lucide-react, dan Tailwind CSS. Patuhi seluruh aturan di bundle-format-rules.md dan docs/UI/design_system.md: (1) Jangan Over-Engineering, (2) Patuh 100% Design System Univet (gunakan variabel CSS --primary-*, --neutral-*, --success/warning/danger/info-*, dilarang menulis hex #... langsung di komponen, gunakan ikon lucide-react, radius 12px/16px/24px/pill, angka tabel rata kanan tabular-nums, kosakata 'Ganti peran'), (3) Anti AI-Slop (nol emoji, nol any, nol komentar sampah), (4) Aturan Next.js App Router (page.tsx wajib async Server Component, dilarang fetch awal di useEffect, 'use client' hanya di komponen daun PrimeReact, mutasi memakai useTransition isPending), dan (5) 9 Kontrak Standar UI PrimeReact." \
  --prompt "Implementasikan Slice 3C (Halaman Server Component & Komponen Client PrimeReact + lucide-react) berdasarkan docs/UI/design_system.md, spesifikasi teknis, serta file Server Actions terlampir. Pastikan kode bersih, rapi, bebas AI-slop, dan langsung siap kompilasi. Hasilkan seluruh file Slice 3C dalam format === FILE: ... ===." \
  --files ".agents/skills/kaf-3-coding/resources/bundle-format-rules.md,docs/UI/design_system.md,docs/specs/<slug>.md,src/lib/validations/<slug>.ts,src/actions/<slug>.ts" \
  --out "docs/specs/.bundle-3c.txt"
```

### 2. Terapkan File Slice 3C
```bash
node .agents/skills/kaf-3-coding/scripts/apply-code-bundle.mjs --in "docs/specs/.bundle-3c.txt"
rm -f docs/specs/.bundle-3c.txt
```

---

## Langkah Akhir Tahap 3
Setelah Slice 3A, 3B, dan 3C selesai ditulis ke disk, **langsung lanjutkan ke Tahap 4 (`kaf-4-review` — Automated Code Review & TypeScript Check)** sebelum menyerahkan hasil ke developer untuk UAT.
