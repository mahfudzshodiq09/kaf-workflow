---
name: kaf-6-memory
description: >-
  Jalankan Tahap 6 (Memory & Progress Update) dari Multi-Model KAF Workflow.
  Gunakan skill ini setelah developer menyatakan fitur LULUS UAT (Gate 3) untuk
  memperbarui docs/PROGRESS.md menggunakan model ag/gemini-3.8-flash-high di 9router
  dan menggabungkan (merge) branch feat/<slug> ke main.
---

# KAF Tahap 6: Memory, Progress Update & Merge Branch (`kaf-6-memory`)

Skill ini mengatur langkah kerja **Orchestrator** pada **Tahap 6 (Tahap Terakhir)** dari KAF Workflow, yang hanya dijalankan **setelah developer menyetujui hasil UAT di Gate 3**.

Tujuan utamanya adalah menjaga memori jangka panjang proyek di `docs/PROGRESS.md` tetap mutakhir dan ringkas, serta menggabungkan (*merge*) branch fitur `feat/<slug>` kembali ke branch utama `main`.

---

## Langkah Eksekusi Step-by-Step

### Langkah 1: Update `docs/PROGRESS.md` via `9router` (`flash`)
Kirimkan `docs/specs/<slug>.md` dan `prisma/schema.prisma` (serta `docs/PROGRESS.md` jika sudah ada) ke model **`ag/gemini-3.8-flash-high`**:

```bash
node scripts/9router.mjs \
  --role flash \
  --system "Kamu adalah Technical Documentation Maintainer. Tugasmu adalah memelihara file docs/PROGRESS.md agar selalu ringkas, padat, dan akurat sebagai memori proyek." \
  --prompt "Perbarui (atau buat) dokumen docs/PROGRESS.md untuk mencatat bahwa fitur [<NAMA FITUR>] telah selesai dan LULUS UAT. Cantumkan secara ringkas: (1) Daftar Fitur Selesai beserta tanggal & rute utamanya, (2) Katalog Tabel Database yang sudah aktif di prisma/schema.prisma, (3) Daftar Komponen & Helper Reusable (seperti Role Switcher, UI Contract, ActionResponse), dan (4) Catatan integrasi untuk modul berikutnya." \
  --files "docs/specs/<slug>.md,prisma/schema.prisma" \
  --out "docs/PROGRESS.md"
```

### Langkah 2: Tandai Spesifikasi Selesai
Perbarui baris status di bagian atas `docs/specs/<slug>.md` menjadi:
`> **Status:** Selesai & Lulus UAT (Done)`

### Langkah 3: Commit & Merge Branch `feat/<slug>` ke `main`
Jalankan perintah Git otomatis untuk mengunci hasil akhir modul ke cabang utama `main`:

```bash
git add . && git commit -m "docs(<slug>): lulus UAT & update PROGRESS.md" --allow-empty && git checkout main && git merge --no-ff feat/<slug> -m "Merge branch 'feat/<slug>' into main (Lulus UAT)"
```

### Langkah 4: Laporan Penutup Fitur
Tampilkan link ke `[docs/PROGRESS.md](file:///.../docs/PROGRESS.md)` dan beri tahu developer bahwa siklus SDLC untuk fitur tersebut telah tuntas 100%, branch `feat/<slug>` telah digabung ke `main`, dan siap beralih ke modul/fitur berikutnya.
