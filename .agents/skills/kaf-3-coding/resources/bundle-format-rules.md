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
- **Hanya tulis path milik tahapmu** (daftar ada di prompt). Bundle yang berisi path lain (`.env`, `package.json`, `prisma/schema.prisma`, `src/lib/auth.ts` milik bersama, file modul lain) **ditolak utuh** oleh `apply-code-bundle.mjs` — tidak ada satu file pun yang ditulis.
- Setiap blok wajib ditutup `=== END FILE: <path> ===`. Blok yang tidak ditutup dianggap output terpotong dan seluruh bundle ditolak.

---

## 2. Prinsip Anti Over-Engineering (KISS & YAGNI)
1. **Struktur File Sesuai §4:** File secukupnya, dikelompokkan per modul, tetapi **tidak ada file raksasa** (maks 400 baris per file di `src/`).
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

## 4. Struktur File Modul & Batas 400 Baris
File besar mahal untuk diaudit/diperbaiki (model harus menulis ulang seluruh file) dan rawan terpotong. Karena itu:

| Isi | Path (rute halaman = `/<slug>`) |
|---|---|
| Model & enum baru | `prisma/modules/<slug>.prisma` (fragmen — lihat §8) |
| Seeder modul | `prisma/seeds/<slug>.ts` |
| Schema Zod + tipe DTO | `src/lib/validations/<slug>.ts` |
| Aturan bisnis & guard (fungsi murni) | `src/lib/<slug>/rules.ts` (boleh tambah `src/lib/<slug>/*.ts` lain) |
| Server actions per peran | `src/actions/<slug>/<peran>.ts` (mis. `mahasiswa.ts`, `dosen.ts`, `admin.ts`) |
| Query data halaman (server) | `src/actions/<slug>/queries.ts` |
| Tes backend | `scripts/verify-<slug>-backend.ts` |
| Halaman | `src/app/<slug>/page.tsx`, `loading.tsx`, sub-rute di bawahnya |
| Komponen client per area | `src/components/<slug>/<area>.tsx` (mis. `filter-bar.tsx`, `krs-table.tsx`, `detail-dialog.tsx`) |

- **Maksimal 400 baris per file** `.ts/.tsx` di `src/`. Lebih dari itu ditolak otomatis → pecah per peran (actions) atau per area layar (komponen).
- `src/lib/auth.ts` dan `src/lib/prisma.ts` adalah **milik bersama**: hanya dibuat modul pertama. Modul berikutnya **import saja**, tidak menulis ulang.

---

## 5. Guard Sebagai Fungsi Murni + Tes Wajib
1. **Semua aturan yang menentukan boleh/tidak** (peran, kepemilikan data, kuota/kapasitas, bentrok jadwal, batas SKS, jendela waktu, aturan Gate 1) ditulis sebagai **fungsi murni** di `src/lib/<slug>/rules.ts`: hanya menerima data biasa, mengembalikan nilai/boolean. **Tanpa** `prisma`, `cookies()`, `server-only`, atau `next/*` — supaya bisa dites tanpa database dan tanpa server.
2. Server action memanggil fungsi murni itu **di dalam** `prisma.$transaction` (data dibaca dulu dalam transaksi, lalu diputuskan oleh fungsi murni), sehingga kuota tetap aman saat akses bersamaan.
3. **`scripts/verify-<slug>-backend.ts` wajib** (`node:assert/strict`, dijalankan `npx tsx`), minimal menguji:
   - Pemilik data **boleh**, bukan pemilik **ditolak**.
   - Peran yang salah **ditolak**, peran yang benar **boleh**.
   - Kuota/kapasitas **penuh ditolak**, sisa 1 **boleh** (dan bentrok jadwal ditolak bila relevan).
   - Setiap aturan di "Keputusan Final Gate 1" pada spec: 1 kasus lolos + 1 kasus ditolak.
   - Pesan `assert` berbahasa Indonesia yang menjelaskan aturannya (mis. `"Mahasiswa lain tidak boleh mengubah KRS ini"`).
4. `kaf-code.mjs` menjalankan tes ini setelah 3B dan di tahap 4. **Gagal = berhenti** (tidak dicentang, tidak di-commit, tidak diperbaiki otomatis).

---

## 6. Tabel Data dari Database Wajib Lazy (Paginasi di Server)
1. Daftar yang berasal dari database (mahasiswa, KRS, tagihan, log, dll.) wajib:
   - Query server memakai `skip`/`take` + `count` dan mengembalikan `{ rows, total, page, limit }`.
   - `page.tsx` membaca `page`, `limit`, `q`, `sort` dari `await searchParams` lalu memanggil query.
   - `<DataTable lazy paginator first={(page - 1) * limit} rows={limit} totalRecords={total} onPage={...} onSort={...} />` — handler mengubah URL (`router.replace` dengan `searchParams` baru) sehingga Server Component mengambil halaman berikutnya.
   - Pencarian/filter juga lewat `searchParams` (debounce di client), bukan `globalFilter` di client.
2. `<DataTable paginator>` **tanpa** `lazy` ditolak oleh `kaf-check`. Pengecualian hanya untuk daftar kecil yang memang statis (mis. ≤ 20 mata kuliah dalam satu dialog), wajib diberi komentar di dalam tag: `{/* kaf-allow-client-paginator: alasan */}`. Lebih baik lagi: daftar kecil tidak perlu `paginator` sama sekali.

---

## 7. Aturan Wajib Next.js (App Router Best Practices)
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

---

## 8. Schema Prisma Bersama (Fragmen per Modul)
`prisma/schema.prisma` dipakai semua modul. Model **tidak pernah** menulisnya langsung:
1. Slice 3A menulis **hanya model & enum baru** ke `prisma/modules/<slug>.prisma` (tanpa `generator`/`datasource`). Boleh mereferensikan model yang sudah ada (`offering ClassOffering @relation(...)`); relasi balik di model lama ditambahkan otomatis oleh `prisma format`.
2. `kaf-code.mjs` menempelkan fragmen ke `schema.prisma` di dalam blok bertanda `// >>> kaf-modul: <slug>` … `// <<< kaf-modul: <slug>`, menjalankan `prisma format`, lalu memastikan **tidak ada model/enum/field lama yang hilang**, kemudian `prisma validate` + `prisma generate`. Gagal di salah satu langkah → schema dikembalikan persis seperti semula.
3. **Dilarang** mendefinisikan ulang model/enum yang sudah ada. Jika spec benar-benar mengharuskan mengubah/menghapus model lama, tulis baris `PERLU_UBAH_MODEL_LAMA: <model & alasan>` di awal output — proses berhenti dan perubahan itu dikerjakan manusia.
4. Seeder `prisma/seeds/<slug>.ts` mandiri & idempoten (`upsert`), `import { prisma } from "../../src/lib/prisma";`, tidak menghapus data modul lain. Dijalankan dengan `npx tsx prisma/seeds/<slug>.ts`.
