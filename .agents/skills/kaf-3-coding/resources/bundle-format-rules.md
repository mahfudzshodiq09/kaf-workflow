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
   - **Nol Komentar Basa-Basi:** Dilarang menulis komentar sampah khas AI yang mengulang kode (misal: `// Import dependencies`, `// Define state`, `// Handle form submission`). Tulis komentar HANYA untuk menjelaskan aturan bisnis yang non-trivial.
   - **Strict TypeScript Tanpa `any`:** Dilarang keras menggunakan `: any`, `as any`, atau `@ts-ignore`. Gunakan tipe dari `@prisma/client` dan `z.infer<typeof Schema>`.
   - **Tanpa Kode Mati:** Jangan menyisakan import, variabel, atau fungsi yang tidak terpakai.
2. **Anti AI-Slop & Kepatuhan Mutlak Design System (`designSystem` di `kaf.config.json`) pada Tampilan UI:**
   - **Design system proyek adalah satu-satunya acuan visual** (warna, huruf, radius, jarak, ikon, istilah). Jika ada yang tidak diatur, pilih yang paling sederhana dan konsisten dengan yang sudah ada.
   - **Token warna lewat variabel CSS:** dilarang menulis hex `#...` di komponen/halaman, dan dilarang `style={{ backgroundColor/color }}` pada tombol/tag/komponen library — varian warna diatur terpusat di CSS global.
   - **Hierarki tombol:** hanya **1 tombol utama** per area; aksi lain memakai varian sekunder/outline/teks. Aksi hapus di baris tabel memakai varian bahaya yang ringan + konfirmasi.
   - **Tata letak berjiwa desain:** gunakan proporsi dari wireframe di spec (mis. split-view 2 kolom untuk rincian + percakapan), jangan menumpuk semua isi vertikal di dialog sempit.
   - **Angka di tabel rata kanan** (`tabular-nums`); ikon dari `stack.icons` dengan ukuran konsisten; tombol hanya-ikon wajib `aria-label`.
   - **Istilah baku** mengikuti `project.language` dan design system (mis. "Masuk/Keluar", bukan campur bahasa). Bila `auth.mode = demo`, pita simulasi peran tampil di atas halaman dengan warna peringatan.
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
| Server actions per peran | `src/actions/<slug>/<peran>.ts` (mis. `anggota.ts`, `admin.ts`; tanpa login: per area, mis. `board.ts`, `card.ts`) |
| Query data halaman (server) | `src/actions/<slug>/queries.ts` |
| Tes backend | `scripts/verify-<slug>-backend.ts` |
| Halaman | `src/app/<slug>/page.tsx`, `loading.tsx`, sub-rute di bawahnya |
| Komponen client per area | `src/components/<slug>/<area>.tsx` (mis. `filter-bar.tsx`, `item-table.tsx`, `detail-dialog.tsx`) |

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
   - Pesan `assert` berbahasa Indonesia yang menjelaskan aturannya (mis. `"Anggota lain tidak boleh mengubah kartu ini"`).
4. `kaf-code.mjs` menjalankan tes ini setelah 3B dan di tahap 4. **Gagal = berhenti** (tidak dicentang, tidak di-commit, tidak diperbaiki otomatis).

---

## 6. Tabel Data dari Database Wajib Lazy (Paginasi di Server)
1. Daftar yang berasal dari database (pengguna, transaksi, tugas, log, dll.) wajib:
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
   - Pasang `'use client'` hanya pada komponen interaktif di `src/components/<slug>/` yang membutuhkan *state*, *event handler*, atau *overlay* (tabel, dialog, toast, drag & drop).
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
