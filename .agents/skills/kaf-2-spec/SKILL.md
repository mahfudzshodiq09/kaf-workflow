---
name: kaf-2-spec
description: >-
  Jalankan Tahap 2 (Unified Tech Spec: PRD + UI PrimeReact + DB Schema + API Contract) dari
  Multi-Model KAF Workflow. Gunakan skill ini setelah dokumen Discovery (Tahap 1) memiliki
  Keputusan Final Gate 1, dengan mendelegasikan penyusunan docs/specs/<fitur>.md ke model
  cx/gpt-6.1-sol di 9router.
---

# KAF Tahap 2: Unified Tech Spec (`kaf-2-spec`)

Skill ini mengatur langkah kerja **Orchestrator** pada **Tahap 2** dari KAF Workflow.
Tujuan utamanya adalah mengubah dokumen Proses Bisnis & Keputusan Gate 1 (`docs/discovery/<slug>.md`) menjadi **1 dokumen Spesifikasi Teknis Terpadu (`docs/specs/<slug>.md`)** menggunakan model **`sol` (`cx/gpt-6.1-sol`)** di `9router`.

## Aturan Mutlak Penulisan Tech Spec
1. **Padat, Teknis, & To-The-Point:** Dokumen ini ditujukan untuk **Programmer & AI Coder**. Gunakan tabel, skema kode (`prisma`), dan poin-poin tajam tanpa kalimat pengantar yang bertele-tele.
2. **Patuh 100% pada Keputusan Gate 1:** Seluruh aturan validasi, alur layar, dan struktur tabel wajib mengimplementasikan bagian **"Keputusan Final Alur Kampus (Terkunci — Gate 1)"** pada `docs/discovery/<slug>.md`.
3. **Wajib Memuat 9 Standar UI PrimeReact:**
   - `<BreadCrumb />` & Page Header di tiap halaman
   - `<Skeleton />` saat loading data / ganti filter
   - `<Button disabled={isPending} loading={isPending} />` saat submit
   - `<Toast />` untuk setiap feedback mutasi
   - `<ConfirmDialog />` untuk aksi krusial/destruktif/massal
   - *Empty State* informatif pada `<DataTable>`
   - Standar `<DataTable>` (`paginator` 10/25/50, `stripedRows`, `removableSort`, search)
   - Validasi form inline (`p-invalid` & `<small className="p-error">`)
   - Standar warna `<Tag />` (`info`, `warning`, `success`, `danger`)
4. **Wajib Memuat 7 Standar Backend (BE):**
   - Kontrak return seragam `ActionResponse<T>` (`{ success, message, data, fieldErrors }`) tanpa crash 500
   - Validasi input server dengan `Zod`
   - Transaksi atomik `prisma.$transaction` untuk mutasi multi-tabel
   - *Role & Ownership Guard* di baris pertama setiap action
   - *Concurrency / Quota Guard* di dalam transaksi DB (anti kuota kelas minus)
   - Pencatatan *Audit Log* otomatis (`AuditLog`) & larangan *hard-delete* sembarangan
   - *Server-side pagination & filtering* (`skip` & `take`) untuk tabel daftar besar
5. **Mandiri untuk Diuji (Mock Role Switcher + Minimal Stub Tables):**
   - Menyertakan desain **Role Switcher** sederhana dan **Tabel Stub Referensi + Data Seeder** secukupnya agar fitur bisa langsung dijalankan dan diuji di browser pada Tahap 5 (UAT).
6. **Anti Over-Engineering (KISS & YAGNI) & Checklist Task Bertahap:**
   - Rancang jumlah tabel, jumlah Server Actions, dan jumlah file **seramping mungkin** (jangan membuat > 8–10 file untuk 1 fitur, jangan membuat *background cron/worker*, *custom crypto*, atau *abstraction layer* jika bisa diselesaikan dengan query/transaksi langsung).
   - Bagian 6 wajib berupa **Checklist Task Eksekusi (`- [ ]`)** dengan kode task spesifik (`T3A.1`, `T3A.2`, `T3B.1`, `T3B.2`, `T3C.1`, dst.) agar developer bisa mengerjakan sebagian (nyicil), menghentikan proses kapan saja jika waktu/token terbatas, dan melanjutkan kembali (*Pause & Resume*).
7. **WAJIB BERHENTI di Gate 2:** Setelah `docs/specs/<slug>.md` selesai dibuat, Orchestrator dilarang menulis kode aplikasi sebelum developer me-*review* dan menyetujui dokumen Tech Spec tersebut.

---

## Langkah Eksekusi Step-by-Step

### Langkah 1: Pastikan Gate 1 Sudah Terkunci
Periksa apakah `docs/discovery/<slug>.md` sudah memiliki bagian **Keputusan Final Alur Kampus (Gate 1)**.

### Langkah 2: Delegasikan Penyusunan Unified Tech Spec ke `9router` (`sol`)
Kirim file `docs/discovery/<slug>.md`, `docs/UI/design_system.md`, dan template [spec-template.md](./resources/spec-template.md) ke model **`cx/gpt-6.1-sol`** melalui `scripts/9router.mjs`:

```bash
node scripts/9router.mjs \
  --role sol \
  --system "Kamu adalah Principal Fullstack Architect yang ahli merancang sistem SIAKAD modern menggunakan Next.js (App Router + TypeScript), PrimeReact, lucide-react, Tailwind CSS, Prisma ORM, Zod, dan PostgreSQL. Prinsip utamamu adalah KISS & YAGNI (Jangan Over-Engineering) dan patuh 100% pada docs/UI/design_system.md." \
  --prompt "Susun dokumen Unified Tech Spec untuk [<NAMA FITUR>] berdasarkan dokumen proses bisnis & Keputusan Final Gate 1 serta docs/UI/design_system.md terlampir, dengan mengikuti struktur persis pada spec-template.md. Pastikan: (1) Skenario Role Switcher ('Ganti peran') simpel agar semua role bisa diuji coba langsung tanpa menunggu modul SSO, (2) Spesifikasi halaman & komponen PrimeReact + lucide-react yang mematuhi docs/UI/design_system.md beserta 9 Kontrak Standar UI/UX Wajib, (3) 7 Standar Arsitektur Backend Wajib + aturan validasi spesifik Keputusan Gate 1 tanpa over-engineering, (4) ERD Mermaid + Schema Prisma ramping + skenario data uji seeder, (5) Tabel kontrak Server Actions yang ringkas dan esensial saja, dan (6) Tabel Checklist Task Eksekusi dengan kode T3A.x, T3B.x, T3C.x yang flat (maksimal 8-10 file total) untuk mendukung pengerjaan bertahap (Pause & Resume)." \
  --files ".agents/skills/kaf-2-spec/resources/spec-template.md,docs/UI/design_system.md,docs/discovery/<slug>.md" \
  --out "docs/specs/<slug>.md"
```

*(Jalankan dengan `BypassSandbox: true` jika koneksi localhost `9router` diblokir oleh sandbox).*

### Langkah 3: Gate 2 — Review & Approval Developer
1. Periksa apakah `docs/specs/<slug>.md` sudah terbentuk dengan lengkap dan rapi.
2. Tampilkan link klik-able `[docs/specs/<slug>.md](file:///.../docs/specs/<slug>.md)` kepada developer.
3. Tanyakan kepada developer apakah dokumen Tech Spec tersebut sudah disetujui (**Gate 2 Approval**) atau ada yang perlu direvisi sebelum masuk ke Tahap 3 (Coding).
4. **STOP.** Tunggu *approval* developer sebelum melangkah ke Tahap 3.
