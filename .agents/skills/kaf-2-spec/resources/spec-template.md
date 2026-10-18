# Unified Tech Spec: [NAMA FITUR / MODUL]

> **Status:** 🟡 Menunggu Review & Approval Developer (Gate 2)  
> **Sumber Acuan:** `docs/discovery/[slug].md` (Keputusan Gate 1 Terkunci)  
> **Tech Stack:** Next.js (App Router + TypeScript) + PrimeReact + Tailwind CSS + PostgreSQL (Prisma + Zod)

---

## 1. Lingkup Teknis & Simulasi Role (Mock Auth)
*(Ringkasan padat apa yang dibangun pada spesifikasi ini dan daftar Role yang disimulasikan melalui **Role Switcher** agar fitur dapat diuji langsung tanpa menunggu modul SSO).*

| Role Simulasi | Identitas Dummy (Seed) | Hak Akses & Skenario Uji Utama |
|---|---|---|
| **Mahasiswa** | `...` | `...` |
| **Dosen Wali (DPA)** | `...` | `...` |
| **Admin Akademik / Keuangan** | `...` | `...` |

---

## 2. Spesifikasi Antarmuka, Layout Blueprint & Komponen PrimeReact
*(Daftar layar/tab, sketsa tata letak ruang, dan komponen PrimeReact yang digunakan. Langsung to-the-point).*

| Halaman / Tab | Target Role | BreadCrumb | Komponen PrimeReact Utama | Kolom Tabel / Field Input & Aksi |
|---|---|---|---|---|
| **[Nama Tab/View 1]** | `...` | `Beranda > ... > ...` | `BreadCrumb`, `DataTable`, `Skeleton`, `Tag`, `Button`, `Dialog` | • **Filter:** ...<br>• **Kolom:** ...<br>• **Aksi:** ... |
| **[Nama Tab/View 2]** | `...` | `...` | `...` | ... |

### Layout Blueprint / Wireframe Struktur (Proporsi Ruang & Hierarki Visual)
*(Wajib gambarkan sketsa blok ASCII untuk halaman utama dan dialog kompleks seperti Rincian & Konsultasi agar proporsi kolom kiri-kanan, kartu statistik, dan hierarki 1 tombol solid per area jelas sebelum dikoding di Slice 3C)*:
```text
+-----------------------------------------------------------------------------------+
| Pita Simulasi: [Ganti peran: ...]                                                 |
+-----------------------------------------------------------------------------------+
| BreadCrumb: Beranda > ... > ...                                                   |
| Judul Halaman (1.75rem/700)                       [Tombol Outlined] [Tombol Solid]|
+-----------------------------------------------------------------------------------+
| [Kartu Stat 1]     [Kartu Stat 2]     [Kartu Stat 3]     [Kartu Stat 4]           |
+-----------------------------------------------------------------------------------+
| Dialog Rincian & Konsultasi (Split-View 2 Kolom: 60% Rincian Kiri | 40% Chat Kanan)|
+-----------------------------------------------------------------------------------+
```

### Kontrak Standar UI/UX Wajib (PrimeReact Contract)
Seluruh halaman dan komponen pada fitur ini **WAJIB** menerapkan 9 standar UI berikut:
1. **Navigasi `<BreadCrumb />` & Page Header:** Setiap halaman wajib menampilkan `<BreadCrumb />` PrimeReact di bagian atas diikuti judul halaman dan deskripsi singkat 1 baris.
2. **Loading State (`<Skeleton />`):** Saat data sedang dimuat (initial fetch atau ganti filter/role), wajib menampilkan `<Skeleton />` PrimeReact atau baris skeleton pada `<DataTable>` (dilarang layar kosong/berkedip).
3. **Submit Lock (`Button Disabled & Loading`):** Setiap tombol submit/mutasi wajib menggunakan `disabled={isPending}` dan `loading={isPending}` pada `<Button />` PrimeReact untuk mencegah klik ganda (*double-submit*).
4. **Feedback Notifikasi (`<Toast />`):** Setiap hasil mutasi (sukses maupun gagal validasi) wajib memunculkan `<Toast />` PrimeReact.
5. **Konfirmasi Aksi Krusial (`<ConfirmDialog />`):** Aksi destruktif, pembatalan, atau persetujuan massal wajib melalui `<ConfirmDialog />` PrimeReact.
6. **Empty State Informatif:** Properti `emptyMessage` pada `<DataTable>` wajib menampilkan ikon dan pesan bahasa Indonesia yang jelas (bukan sekadar *"No records found"*).
7. **Standar `<DataTable>` SIAKAD:** Wajib mengaktifkan `paginator`, `rows={10}`, `rowsPerPageOptions={[10, 25, 50]}`, `stripedRows`, `removableSort`, serta pencarian/filter.
8. **Validasi Form Inline (`p-invalid` & `p-error`):** Field input yang gagal validasi wajib diberi class `p-invalid` (garis merah) dan menampilkan pesan `<small className="p-error">` tepat di bawah field terkait.
9. **Standar Warna `<Tag />` Status:**
   - `info` (Biru) = Draf / Belum Diajukan
   - `warning` (Kuning) = Diajukan / Menunggu Persetujuan
   - `success` (Hijau) = Disetujui / Lunas / Aktif
   - `danger` (Merah) = Ditolak / Cekal / Non-Aktif

---

## 3. Aturan Validasi & Standar Guard Backend (BE Contract)

### A. Standar Arsitektur Backend Wajib (7 Pilar BE)
1. **Kontrak Response Seragam (`ActionResponse<T>`):** Semua Server Actions / API dilarang melempar *unhandled exception* ke UI, dan wajib mengembalikan:
   ```ts
   type ActionResponse<T = void> = {
     success: boolean;
     message: string;
     data?: T;
     fieldErrors?: Record<string, string[]>;
   };
   ```
2. **Validasi Input Server (`Zod`):** Seluruh input payload wajib divalidasi di sisi server menggunakan skema `Zod` sebelum mengeksekusi query database.
3. **Transaksi Atomik (`prisma.$transaction`):** Setiap mutasi yang mengubah $>1$ tabel (misal: *update status KRS* + *insert Audit Log*, atau *cek kuota kelas* + *insert KRS detail*) wajib dibungkus dalam `prisma.$transaction`.
4. **Role & Ownership Guard (`assertRole` & `assertOwnership`):** Baris pertama setiap action wajib memverifikasi bahwa `actor` memiliki role yang sesuai dan berhak atas data tersebut (misal: mahasiswa hanya boleh mengubah KRS miliknya sendiri; dosen wali hanya boleh memvalidasi mahasiswa bimbingannya).
5. **Concurrency / Quota Guard:** Pengecekan kuota kelas (`terisi < kapasitas`) dan pencegahan bentrok jadwal wajib dilakukan di dalam transaksi database agar kuota tidak pernah bernilai minus saat terjadi akses bersamaan (*race condition*).
6. **Audit Trail Otomatis & Anti-Hard-Delete:** Aksi krusial (persetujuan/penolakan KRS, dispensasi cekal, penetapan status semester) wajib mencatat jejak ke tabel `AuditLog` (`actorId`, `actorRole`, `action`, `entityName`, `entityId`, `reason`, `createdAt`) dan dilarang melakukan *hard-delete* pada rekaman historis akademik.
7. **Server-Side Pagination & Filtering:** Query daftar berjumlah besar wajib mendukung parameter `page`, `limit`, `search`, dan `filter` menggunakan `skip` & `take` di level database.

### B. Aturan Validasi Spesifik Fitur (Sesuai Keputusan Gate 1)
1. **[Aturan 1]:** ...
2. **[Aturan 2]:** ...

---

## 4. Skema Database PostgreSQL & Rencana Seeder

### A. Diagram Relasi Tabel (ERD Ringkas)
```mermaid
erDiagram
    TABEL_A ||--o{ TABEL_B : "memiliki"
```

### B. Definisi Tabel (Tabel Stub Referensi + Tabel Inti Fitur + Tabel AuditLog)
*(Pisahkan dengan komentar mana **Tabel Stub Referensi** agar fitur bisa jalan mandiri, mana **Tabel Inti Fitur**, dan **Tabel AuditLog**).*

```prisma
// [Tulis definisi model Prisma secara presisi beserta tipe data, indeks, dan relasinya]
```

### C. Skenario Data Uji (`seed`)
*(Daftar data awal yang wajib di-seed otomatis pada Tahap 3A agar seluruh skenario positif & negatif bisa langsung dicoba di browser)*:
* ...

---

## 5. Kontrak Server Actions / API
| Nama Action | Role Diizinkan | Input Payload (`Zod`) | Validasi & Transaksi DB (`$transaction`) | Return (`ActionResponse<T>`) |
|---|---|---|---|---|
| `...` | `...` | `{ ... }` | 1. Guard Role & Ownership<br>2. ...<br>3. Tulis `AuditLog` | `{ success, message, data, fieldErrors }` |

---

## 6. Tabel Checklist Task Eksekusi (Pause & Resume — Tahap 3)
*(Gunakan tabel di bawah ini agar pengerjaan Tahap 3 dapat dicicil sebagian, di-pause saat waktu/token terbatas, dan dilanjutkan kembali dari baris pertama yang masih berstatus `[ ] Belum`)*:

| Kode Task | Slice & Model | Status | File Target | Deskripsi Tugas & Kriteria Selesai |
|---|---|---|---|---|
| `T3A.1` | **3A — DB & Seed** (`sol`) | `[ ] Belum` | `prisma/schema.prisma`, `src/lib/prisma.ts` | Skema Prisma lengkap & singleton client; lulus `npx prisma validate && npx prisma generate`. |
| `T3A.2` | **3A — DB & Seed** (`sol`) | `[ ] Belum` | `prisma/seed.ts` | Seeder idempoten untuk seluruh role simulasi serta skenario positif & negatif. |
| `T3B.1` | **3B — Backend** (`sol`) | `[ ] Belum` | `src/lib/auth.ts`, `src/lib/validations/[slug].ts` | Helper Role Switcher (`demo_user_id`), guard role/ownership, tipe `ActionResponse<T>`, DTO, dan schema Zod. |
| `T3B.2` | **3B — Backend** (`sol`) | `[ ] Belum` | `src/actions/[slug].ts` | Implementasi Server Actions alur inti beserta transaksi `prisma.$transaction` dan `AuditLog`. |
| `T3B.3` | **3B — Backend** (`sol`) | `[ ] Belum` | `src/actions/[slug].ts`, `scripts/verify-[slug]-backend.ts` | Implementasi Server Actions admin/pendukung & skrip verifikasi otomatis logika backend. |
| `T3C.1` | **3C — UI PrimeReact** (`flash`) | `[ ] Belum` | `src/app/[slug]/page.tsx`, `src/app/[slug]/loading.tsx` | Halaman `async` Server Component (fetch data awal di server) dan boundary `<Skeleton />`. |
| `T3C.2` | **3C — UI PrimeReact** (`flash`) | `[ ] Belum` | `src/components/[slug]/[slug]-workspace.tsx` | Komponen utama `'use client'` (Role Switcher, BreadCrumb, Toast, ConfirmDialog, DataTable, form & validasi inline). |
| `T3C.3` | **3C — UI PrimeReact** (`flash`) | `[ ] Belum` | `src/app/[slug]/[id]/cetak/page.tsx` | Panel konfigurasi pendukung & halaman cetak resmi hingga seluruh skenario role siap UAT. |


