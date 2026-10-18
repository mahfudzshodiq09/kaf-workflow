---
name: kaf-4-review
description: >-
  Jalankan Tahap 4 (Automated Code Review & Fix) dari Multi-Model KAF Workflow.
  Gunakan skill ini setelah Slice 3A, 3B, dan 3C selesai dikoding untuk menjalankan
  pengecekan TypeScript (tsc --noEmit) dan audit kode menyeluruh menggunakan model
  cx/gpt-6.1-sol di 9router sebelum masuk ke Tahap 5 (UAT Developer).
---

# KAF Tahap 4: Automated Code Review & Fix (`kaf-4-review`)

Tujuan: kode hasil Tahap 3 **0 error TypeScript**, **tes backend lulus**, **bersih dari pelanggaran wajib**,
dan **lulus audit `sol`** sebelum diuji developer di browser (Tahap 5 — UAT).

---

## Langkah 1: Jalankan Tahap 4 Lewat Skrip
```bash
node scripts/kaf-code.mjs --slug <slug> --slice 4
```
Urutan di dalam skrip:
1. **4A** `npx tsc --noEmit` → error dikirim ke `sol` (maks 2x perbaikan, lalu dicek ulang; masih error → berhenti).
2. **Tes backend** `scripts/verify-<slug>-backend.ts` (gagal → berhenti, tidak diperbaiki otomatis).
3. **kaf-check** (0 token): file > 400 baris, `any`/`@ts-ignore`, `page.tsx` ber-`'use client'`, `<DataTable paginator>` tanpa `lazy`, hex warna (saran).
4. **4B Audit `sol`** terhadap `review-checklist.md`, `bundle-format-rules.md`, design system, spec, dan schema — temuan kaf-check ikut dikirim. Perbaikan hanya boleh menyentuh path modul ini.
5. Setelah perbaikan: tsc + tes backend + kaf-check diulang. Masih ada temuan wajib → berhenti.
6. Lulus semua → commit di `feat/<slug>` dan tampilkan daftar file + baris untuk dibaca developer.

Orchestrator **tidak membaca kode**; cukup teruskan ringkasan output skrip. Pemeriksaan statis bisa dijalankan
manual kapan saja tanpa token: `node scripts/kaf-check.mjs --slug <slug>`.

## Langkah 2: Serahkan ke Tahap 5 — Gate 3 (UAT Developer)
1. Siapkan database lokal (jika belum): `npx prisma db push && npx tsx prisma/seeds/<slug>.ts`, lalu `npm run dev`.
2. Sajikan **Panduan Skenario Uji Coba Singkat (UAT)** di chat agar developer bisa mencoba fitur di `localhost:3000/<slug>` memakai **Role Switcher**.
3. Ingatkan developer untuk membaca sendiri `src/lib/<slug>/rules.ts` dan `src/actions/<slug>/` (guard, transaksi, kuota) — daftar file dicetak di akhir output skrip.
4. **STOP (Gate 3 — UAT):** Tunggu hasil uji coba dan *feedback* developer sebelum menjalankan `kaf-6-memory`.
