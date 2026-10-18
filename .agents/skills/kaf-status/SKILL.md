---
name: kaf-status
description: >-
  Cek daftar tugas (Checklist Task Table), progres modul SDLC, dan branch Git aktif.
  Gunakan skill ini saat developer mengetik /kaf-status atau menanyakan daftar tugas
  yang sudah selesai [x] maupun yang belum dikerjakan [ ].
---

# KAF Status & Daftar Tugas (`kaf-status`)

Skill ini digunakan untuk mengecek **Daftar Tugas (Checklist Task Table)**, status dokumen Discovery/Spec, dan branch Git aktif secara instan (**0 token ke 9router**).

## Langkah Eksekusi
1. Jalankan skrip lokal berikut menggunakan `run_command`:
   ```bash
   node scripts/kaf-status.mjs [slug-opsional]
   ```
2. Tampilkan tabel ringkasan progres dan daftar tugas (`[x] Selesai` vs `[ ] Belum`) secara rapi kepada developer, lengkap dengan rekomendasi langkah/command SDLC berikutnya.
