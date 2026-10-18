---
name: kaf-4-review
description: >-
  Jalankan Tahap 4 (Automated Code Review & Fix) dari Multi-Model KAF Workflow.
  Gunakan skill ini setelah Slice 3A, 3B, dan 3C selesai dikoding untuk menjalankan
  pengecekan TypeScript (tsc --noEmit) dan audit kode menyeluruh menggunakan model
  cx/gpt-6.1-sol di 9router sebelum masuk ke Tahap 5 (UAT Developer).
---

# KAF Tahap 4: Automated Code Review & Fix (`kaf-4-review`)

Skill ini mengatur langkah kerja **Orchestrator** pada **Tahap 4** dari KAF Workflow.
Tujuannya adalah memastikan kode hasil Tahap 3 **bebas error kompilasi TypeScript** dan **lulus audit kualitas 100%** oleh model **`sol` (`cx/gpt-6.1-sol`)** sebelum diserahkan kepada developer untuk diuji di browser (**Tahap 5 — UAT**).

---

## Langkah Eksekusi Step-by-Step

### Langkah 1: Static Type & Schema Check (`prisma validate` & `tsc --noEmit`)
Jalankan pengecekan statis terlebih dahulu:
```bash
npx prisma validate
npx tsc --noEmit
```
Jika ada error sintaks atau tipe dari `tsc --noEmit`, kumpulkan pesan error-nya agar sekaligus diperbaiki pada Langkah 2.

### Langkah 2: Audit Kode Otomatis via `9router` (`sol`)
Kirimkan checklist [review-checklist.md](./resources/review-checklist.md), spesifikasi `docs/specs/<slug>.md`, serta seluruh file kode fitur yang dibuat pada Slice 3A, 3B, dan 3C ke model **`cx/gpt-6.1-sol`**:

```bash
node scripts/9router.mjs \
  --role sol \
  --system "Kamu adalah Principal Code Reviewer & QA Architect. Tugasmu adalah mengaudit kode hasil implementasi terhadap spesifikasi teknis, docs/UI/design_system.md, dan review-checklist.md secara tanpa kompromi. Jika ada ketidaksesuaian, bug logika, pelanggaran standar UI/BE/Next.js/Design System, atau AI-slop, keluarkan STATUS: NEEDS_FIX beserta blok perbaikan === FILE: <path> === yang utuh." \
  --prompt "Audit seluruh file kode terlampir berdasarkan review-checklist.md, docs/UI/design_system.md, dan docs/specs/<slug>.md. Jika semua sudah sempurna, keluarkan STATUS: PASS. Jika ada bug atau pelanggaran sekecil apa pun, keluarkan STATUS: NEEDS_FIX dan berikan file perbaikan lengkapnya dalam format === FILE: ... ===." \
  --files ".agents/skills/kaf-4-review/resources/review-checklist.md,docs/UI/design_system.md,docs/specs/<slug>.md,prisma/schema.prisma,src/lib/validations/<slug>.ts,src/actions/<slug>.ts,<daftar-file-ui-terkait>" \
  --out "docs/specs/.review-<slug>.txt"
```

### Langkah 3: Terapkan Perbaikan Otomatis (Jika `STATUS: NEEDS_FIX`)
1. Cek isi `docs/specs/.review-<slug>.txt`.
2. Jika terdapat blok `=== FILE: ... ===`, jalankan unpacker untuk menimpa file yang diperbaiki:
   ```bash
   node .agents/skills/kaf-3-coding/scripts/apply-code-bundle.mjs --in "docs/specs/.review-<slug>.txt"
   ```
3. Jalankan ulang `npx tsc --noEmit` untuk memastikan hasil perbaikan 100% lolos kompilasi tanpa error.
4. Simpan ringkasan laporan review dan hapus file sementara `.review-<slug>.txt`.

### Langkah 4: Serahkan ke Tahap 5 — Gate 3 (UAT Developer)
Setelah `tsc --noEmit` = 0 error dan status review = `PASS`:
1. Pastikan dev server (`npm run dev`) berjalan.
2. Sajikan **Panduan Skenario Uji Coba Singkat (UAT)** di chat agar developer bisa langsung mencoba fitur tersebut di browser (`localhost:3000`) menggunakan **Role Switcher**.
3. **STOP (Gate 3 — UAT):** Tunggu hasil uji coba dan *feedback* dari developer sebelum menjalankan `kaf-6-memory`.
