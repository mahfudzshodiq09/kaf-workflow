# Checklist Audit Kode Otomatis (Tahap 4 — `kaf-4-review`)

Model reviewer (`models.review` di `kaf.config.json`) wajib memeriksa kode hasil Slice 3A, 3B, dan 3C berdasarkan 5 kategori tegas berikut:

## 1. Kesesuaian Spesifikasi & Logika Bisnis (`docs/specs/<slug>.md`)
- [ ] Seluruh keputusan Gate 1 dan Gate 2 pada `docs/specs/<slug>.md` terimplementasi dengan benar.
- [ ] Nama model/kolom di `src/actions/` cocok 100% dengan `prisma/schema.prisma`.
- [ ] Nama fungsi Server Actions dan tipe DTO yang dipanggil di `src/app/` & `src/components/` cocok 100% dengan `src/actions/`.

## 2. Kepatuhan 7 Pilar Backend (BE Contract)
- [ ] Semua Server Actions me-return `ActionResponse<T>` (`{ success, message, data, fieldErrors }`) tanpa melempar *unhandled exception* ke UI.
- [ ] Seluruh input payload divalidasi dengan `Zod` di sisi server.
- [ ] Mutasi multi-tabel dibungkus di dalam `prisma.$transaction`.
- [ ] Memiliki pengecekan *Role & Ownership* sebelum memutasi data.
- [ ] Memiliki *Concurrency / Quota Guard* di dalam transaksi DB (anti kuota minus).
- [ ] Aksi krusial dicatat (jejak perubahan) bila spec memintanya, dan data historis tidak di-*hard-delete*.
- [ ] Tabel besar mendukung paginasi/filter (`skip` & `take`) dan mengembalikan `{ rows, total, page, limit }`.
- [ ] Aturan peran/kepemilikan/kuota/Gate 1 ditulis sebagai **fungsi murni** di `src/lib/<slug>/rules.ts` dan dipakai oleh action (bukan disalin ulang di action).
- [ ] `scripts/verify-<slug>-backend.ts` menguji: pemilik vs bukan pemilik, peran salah, kuota penuh, dan tiap aturan Gate 1 (lolos + ditolak). Tes yang hanya menguji Zod/format **belum cukup**.

## 3. Kepatuhan 9 Kontrak UI & Design System Proyek
- [ ] `<BreadCrumb />` & Page Header tampil di halaman.
- [ ] `<Skeleton />` tampil saat loading / transisi.
- [ ] `<Button loading={isPending} disabled={isPending} />` terpasang pada tombol submit/aksi.
- [ ] `<Toast />` terpasang untuk menampilkan notifikasi hasil mutasi.
- [ ] `<ConfirmDialog />` terpasang untuk aksi krusial/pembatalan/persetujuan massal.
- [ ] `emptyMessage` pada `<DataTable>` menggunakan pesan bahasa Indonesia yang informatif.
- [ ] `<DataTable>` untuk data database memakai `lazy` + `totalRecords` + `first` + `onPage`/`onSort` yang mengubah `searchParams` (paginasi di server), `rows={10}`, `rowsPerPageOptions={[10, 25, 50]}`, `stripedRows`, `removableSort`, serta kolom angka rata kanan (`tabular-nums`).
- [ ] Menampilkan inline error (`p-invalid` & `<small className="p-error">`) jika ada `fieldErrors`.
- [ ] Warna `<Tag />` sesuai standar (`info`, `warning`, `success`, `danger`).
- [ ] **Patuh design system proyek** (`designSystem` di `kaf.config.json`): tidak ada hex `#...` langsung di komponen/halaman (memakai variabel CSS), ikon sesuai `stack.icons`, istilah sesuai `project.language`; bila `auth.mode = demo`, pita simulasi peran tampil.

## 4. Kepatuhan Aturan Next.js App Router
- [ ] `page.tsx` dan `layout.tsx` adalah `async` *Server Component* (tidak mengambil data awal di dalam `useEffect`).
- [ ] Direktif `'use client'` hanya dipasang pada komponen interaktif di `src/components/`.
- [ ] `params`, `searchParams`, dan `cookies()` di-`await` sesuai standar Next.js 15+.
- [ ] Tidak ada objek `Decimal` atau `Date` mentah Prisma yang dikirim langsung ke *Client Component* tanpa serialisasi.

## 5. Anti Over-Engineering & Anti AI-Slop
- [ ] Tidak ada komentar sampah khas AI (`// Import...`, `// Handle submit...`), tidak ada `// TODO` atau kode yang dipotong.
- [ ] Tidak ada penggunaan `: any` atau `as any`.
- [ ] Tidak ada file `.ts/.tsx` di `src/` yang lebih dari 400 baris; actions dipecah per peran, komponen per area.
- [ ] Tidak mengubah file milik bersama/modul lain (`prisma/schema.prisma` langsung, `src/lib/auth.ts` yang sudah ada, `.env`, `package.json`).
- [ ] Tidak ada *emoji* di dalam judul/tombol UI dan tidak ada desain norak khas AI.

---

## Format Output Hasil Review
Jawaban dibaca otomatis oleh `kaf-code.mjs`, jadi formatnya wajib salah satu:
- **Semua lulus:** tepat satu baris `LULUS_AUDIT_TANPA_PERBAIKAN`.
- **Ada temuan:** maksimal 10 baris temuan singkat, lalu kode perbaikan utuh hanya untuk file yang berubah (maks 400 baris/file, hanya path modul ini):
  ```text
  === FILE: path/to/file.ts ===
  // isi kode perbaikan lengkap
  === END FILE: path/to/file.ts ===
  ```
Jawaban yang tidak lulus tetapi tanpa blok perbaikan dianggap tidak jelas dan proses berhenti.
