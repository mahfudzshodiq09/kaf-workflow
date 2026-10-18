# Aturan Kualitas Kode, Anti Over-Engineering, Anti AI-Slop, & Next.js Best Practices (Tahap 3 SDLC)

## 1. Format Output Multi-File Code Bundle
Saat men-generate kode untuk Slice 3A, 3B, atau 3C, kamu **WAJIB** mengeluarkan isi kode secara utuh di dalam blok pembatas berikut untuk setiap file:

```text
=== FILE: path/relatif/dari/root/file.ts ===
// Seluruh isi kode lengkap di sini
=== END FILE: path/relatif/dari/root/file.ts ===
```
- **DILARANG** membungkus isi di dalam `=== FILE: ... ===` dengan markdown fence ` ```ts `.
- **DILARANG** memotong kode dengan komentar seperti `// TODO`, `// ... rest of code`, atau `// implementasi lainnya`. Setiap file harus 100% utuh dan siap di-compile (`tsc --noEmit`).

---

## 2. Prinsip Anti Over-Engineering (KISS & YAGNI)
1. **Struktur File Ramping & Flat:** Jangan memecah kode menjadi puluhan file kecil. Cukup gunakan file yang benar-benar esensial (`prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/prisma.ts`, `src/lib/validations/<slug>.ts`, `src/actions/<slug>.ts`, `src/app/<slug>/page.tsx`, dan 1–3 komponen client di `src/components/<slug>/`).
2. **Tanpa Abstraksi Berlapis:** DILARANG membuat *Repository Pattern*, *Service Class*, *Factory*, *Adapter*, atau *Custom Hook* berlapis-lapis. Panggil `prisma` langsung di dalam *Server Actions*.
3. **Tanpa Infrastruktur Berlebih:** Jangan membuat *background worker*, *cron endpoint*, atau sistem *event bus* jika logika bisnis bisa dijalankan secara langsung (*synchronous / on-demand*) di dalam transaksi database saat aksi dipanggil.

---

## 3. Prinsip Anti AI-Slop (Kode & Tampilan Bersih)
1. **Anti AI-Slop pada Kode:**
   - **Nol Komentar Basa-Basi:** Dilarang menulis komentar sampah khas AI yang mengulang kode (misal: `// Import dependencies`, `// Define state`, `// Handle form submission`). Tulis komentar HANYA untuk menjelaskan aturan bisnis akademik yang non-trivial.
   - **Strict TypeScript Tanpa `any`:** Dilarang keras menggunakan `: any`, `as any`, atau `@ts-ignore`. Gunakan tipe dari `@prisma/client` dan `z.infer<typeof Schema>`.
   - **Tanpa Kode Mati:** Jangan menyisakan import, variabel, atau fungsi yang tidak terpakai.
2. **Anti AI-Slop & Kepatuhan Mutlak `docs/UI/design_system.md` pada Tampilan UI:**
   - **Wajib Patuh `docs/UI/design_system.md` (Single Source of Truth Visual):**
     - **Token Warna CSS Variabel & Larangan Inline Style Tombol:** Dilarang menulis hex `#...` di komponen/halaman. **DILARANG KERAS menulis `style={{ backgroundColor: ... }}` atau `style={{ color: ... }}` pada `<Button />`, `<Tag />`, atau komponen PrimeReact** karena seluruh varian warna tombol (`solid`, `p-button-outlined`, `p-button-text`, `p-button-soft`, `p-button-danger`, `p-button-warning`, `p-button-success`) sudah diatur terpusat di `globals.css`.
     - **Hierarki Tombol (§6):** Hanya boleh ada **1 tombol utama (solid)** per area. Tombol aksi lain wajib menggunakan `outlined`, `text`, atau `className="p-button-soft"`. Tombol hapus di dalam baris tabel wajib menggunakan `className="p-button-danger p-button-text p-button-sm"` (ikon merah di atas latar transparan, hover merah lembut `--danger-50`).
     - **Tata Letak Berjiwa Desain (Layout Archetypes):**
       - Jangan menumpuk tabel rincian dan kotak chat secara vertikal di dalam modal sempit. Untuk dialog **Rincian & Konsultasi**, wajib gunakan **Split-View 2 Kolom (`grid-cols-1 lg:grid-cols-12`, lebar dialog `max-w-5xl`)**: Kolom Kiri (7 kolom / ~60%) untuk Kartu Ringkasan & Tabel Rincian Mata Kuliah, dan Kolom Kanan (5 kolom / ~40%) untuk Panel Percakapan bergaya pesan modern dengan *header* lawan bicara, gelembung pesan rapi, dan *input* pesan di bagian bawah.
     - **Tipografi & Angka:** Gunakan `Plus Jakarta Sans` dengan ukuran dasar `html { font-size: 14px }`, judul halaman `1.75rem/700`, judul kartu `1.1rem/700`, label kapital `0.75rem/600` (`letter-spacing: 0.06em`), dan kolom angka di tabel wajib rata kanan (`tabular-nums`).
     - **Radius & Jarak:** Tombol & isian `12px` (`--radius-md`), kartu & tabel `16px` (`--radius-lg`), dialog `24px` (`--radius-2xl`), tag berbentuk pill (`--radius-full`). Padding kartu `24px` (HP `16px`), jarak antar kartu `20px`.
     - **Ikon Wajib `lucide-react`:** Gunakan ikon dari `lucide-react` (`strokeWidth={2}`, ukuran `16` pada tombol/teks, `20` pada menu, `24` pada empty state). Tombol hanya-ikon wajib memiliki `aria-label`.
     - **Layout `AppShell` & Banner Peran:** Topbar `72px` blur, sidebar `260px` (menu aktif latar `--primary-50`, teks `--primary-700`, garis kiri `3px` `--primary-500`), serta pita simulasi **Ganti peran** di atas topbar memakai latar `--warning-50` dan teks `--warning-700`.
     - **Kosakata Baku Bahasa Indonesia:** Gunakan istilah **Ganti peran** (bukan *Switch role*), **Masuk / Keluar** (bukan *Login / Logout*).
   - **Dilarang Desain Generik Khas AI:** Dilarang menggunakan *gradient ungu/biru neon*, *emoji* di dalam judul halaman, label tabel, maupun tombol aplikasi.

---

## 4. Aturan Wajib Next.js (App Router Best Practices)
1. **Server Components by Default:**
   - Setiap `page.tsx` dan `layout.tsx` **WAJIB** berupa `async` *Server Component*.
   - Pengambilan data awal halaman (*initial data fetching*) wajib dilakukan langsung di *Server Component* (memanggil fungsi query server/Prisma), **DILARANG KERAS** melakukan fetch data awal di dalam `useEffect` pada sisi client!
2. **Batas `'use client'` Hanya di Komponen Daun (Leaf Components):**
   - Pasang `'use client'` hanya pada komponen interaktif PrimeReact di `src/components/<slug>/` yang membutuhkan *state*, *event handler*, atau *overlay* (`DataTable`, `Dialog`, `Toast`, `ConfirmDialog`).
3. **Mutasi via Server Actions + `useTransition` + `revalidatePath`:**
   - Semua mutasi data wajib menggunakan *Server Actions* (`'use server'`).
   - Di sisi client, panggil *Server Action* di dalam `startTransition(async () => { ... })` dari `useTransition()` agar state `isPending` otomatis mengaktifkan `<Button loading={isPending} disabled={isPending} />`.
   - Di sisi server, panggil `revalidatePath('/...')` setelah transaksi database commit agar UI Server Component langsung terbarui.
4. **Next.js 15+ Async Dynamic APIs:**
   - `params`, `searchParams`, `cookies()`, dan `headers()` bersifat *asynchronous* dan **WAJIB** di-`await` (contoh: `const { id } = await params;` dan `const cookieStore = await cookies();`).
5. **Keamanan Serialisasi Server $\rightarrow$ Client:**
   - Objek Prisma yang memiliki tipe `Decimal` atau `Date` **wajib** dikonversi menjadi `number`/`string` (misal `.toNumber()` atau `.toISOString()`) sebelum dikirim sebagai *props* dari *Server Component* atau nilai balik *Server Action* ke *Client Component*.
