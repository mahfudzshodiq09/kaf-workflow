# Design System Univet

> **Versi:** 3.0 · **Tanggal:** 2026-10-03 · **Status:** Disetujui pemilik
> **Berlaku untuk:** semua aplikasi (siakad, SSO, LMS, Feeder, dst.). Bagian §7.1–7.2 dan §8 khusus SSO.
> **Menggantikan:** v2.2 "Navy Flat" (ada di riwayat git) + 5 perubahan yang disetujui 2026-10-03 + warna utama bisa diganti admin (§12).
> **Kode:** `packages/ui/src/tema/` · **Contoh visual:** `docs/UI/contoh/design_system.html`, `contoh-masuk.html`, `contoh-pengaturan-tampilan.html`.
> Ini **satu-satunya acuan tampilan**. Bila kode dan dokumen ini berbeda, dokumen ini yang benar. Ubah dokumen dulu, baru kode.

---

## 0. Ringkas

| Hal | Nilai |
|---|---|
| Warna utama | Navy `#1E3A6E` (bawaan) — **bisa diganti superadmin** lewat menu (§2.2) |
| Warna status | Tetap: sukses `#047857`, peringatan `#B45309`, bahaya `#BE123C`, info `#0369A1` (teks & tombol solid) |
| Huruf | Plus Jakarta Sans, dasar 14px |
| Radius | isian & tombol 12px · kartu 16px · dialog 24px · tag pill |
| Komponen | PrimeReact 10 lewat `@siakad/ui` saja (UI-01) |
| Ikon | lucide-react (UI-15) |
| Kontras | Semua teks ≥ 4,5 : 1 (WCAG 2.2 AA) |

---

## 1. Prinsip

1. **Pintu masuk yang tenang.** SSO adalah halaman pertama semua pengguna. Satu tugas per layar di alur masuk; tidak ada iklan, banner ramai, atau animasi.
2. **Tepercaya.** Warna, logo, dan alamat konsisten supaya pengguna mudah mengenali halaman asli (melawan phishing).
3. **Jelas saat gagal.** Pesan salah memberi tahu apa yang bisa dilakukan, tanpa membocorkan apakah akun ada.
4. **Alur masuk mobile-first** (mahasiswa sering dari HP). **Administrasi Aplikasi desktop-first**, tetap bisa di tablet.

---

## 2. Warna

Semua warna lewat variabel CSS di `packages/ui/src/tema/token.css`. Halaman **tidak boleh** menulis hex (UI-02).

### 2.1 Warna utama (bawaan navy)

| Variabel | Hex | Dipakai untuk |
|---|---|---|
| `--primary-50` | `#F0F4FA` | latar menu aktif, latar lembut, sorot baris tabel |
| `--primary-100` | `#D9E2F5` | hover tombol lembut |
| `--primary-200` | `#B3C5EB` | garis tombol garis |
| `--primary-500` | `#1E3A6E` | **tombol utama**, tautan, fokus, halaman aktif paginator |
| `--primary-600` | `#162D57` | hover tombol utama, ikon menu aktif |
| `--primary-700` | `#102244` | teks di atas `-50` (menu aktif, tag, tombol lembut) |
| `--primary-rgb` | `30 58 110` | bayangan & cincin fokus (`rgb(var(--primary-rgb) / .2)`) |

Tingkat 300, 400, 800, 900 tersedia untuk dekorasi; jangan dipakai untuk teks di atas putih tanpa cek kontras.

### 2.2 Mengganti warna utama ✅ (keputusan pemilik 2026-10-03)

**Siapa & di mana:** superadmin, lewat **Administrasi Aplikasi › Pengaturan › Tampilan** (fitur B16, dibangun di modul 003). Berlaku **langsung tanpa deploy ulang**.

**Cara kerja untuk admin:**
1. Pilih salah satu warna siap pakai **atau** isi kode warna sendiri (`#RRGGBB`).
2. Pratinjau langsung tampil (tombol, menu aktif, tag, tabel) sebelum disimpan.
3. Sistem mengecek keterbacaan. Warna yang gagal **tidak bisa disimpan** dan alasannya ditampilkan.
4. Simpan → tercatat di log perubahan (B11): siapa, kapan, warna lama → baru.
5. Tombol **Kembalikan ke navy** selalu ada.

**Warna siap pakai** (`PILIHAN_WARNA_UTAMA`): Navy (bawaan) `#1E3A6E`, Biru `#1D4ED8`, Petrol `#0E5E78`, Zaitun `#556B2F`, Cokelat `#7A4A1E`, Arang `#334155`. Merah dan hijau sengaja tidak disediakan karena bertabrakan dengan warna status.

**Aturan cek (`periksaWarnaUtama`):**

| Cek | Syarat | Bila gagal |
|---|---|---|
| Tulisan putih di tombol utama (`#FFF` di atas `-500`) | ≥ 4,5 : 1 | **Ditolak** — "warna terlalu terang" |
| Menu aktif (`-700` di atas `-50`) | ≥ 4,5 : 1 | **Ditolak** |
| Kode bukan hex 3/6 digit | — | **Ditolak** |
| Rona mirip merah (bahaya) atau hijau (berhasil) | — | Boleh, tetapi **muncul saran** |

**Yang ikut berubah:** semua `--primary-*` (tombol utama, tautan, fokus, menu aktif, tag bawaan, paginator, tab aktif, progress, avatar).
**Yang tidak berubah:** warna status (sukses/peringatan/bahaya/info), netral, banner "Masuk sebagai pengguna lain" (selalu warna peringatan).

**Skala otomatis:** dari satu warna dibuat tingkat 50–900 (`buatSkalaWarna`: dicampur putih untuk tingkat terang, hitam untuk tingkat gelap). Navy bawaan memakai skala resmi §2.1.

**Teknis (untuk modul 003):**
- Simpan kode hex di tabel pengaturan DB `sso` (bukan file/ENV).
- Server **wajib** memvalidasi ulang dengan `periksaWarnaUtama` (di schema Zod via `refine`), jangan percaya browser.
- Layout `apps/sso` merender `<GayaWarnaUtama warna={pengaturan.warnaUtama} />` dari `@siakad/ui`. Komponen ini hanya menulis variabel `--primary-*` dari hex yang sudah lolos, jadi nilai admin **tidak bisa menyisipkan CSS/HTML lain**.
- Nilai kosong / gagal cek → tidak merender apa pun → tampilan kembali navy.
- Tema Prime sudah memakai variabel (`prime-lara-univet.css`), jadi semua komponen ikut berganti.

### 2.3 Warna status (tetap)

| Status | Latar lembut | Garis/titik | Teks & tombol solid |
|---|---|---|---|
| Sukses | `--success-50` `#ECFDF5` | `--success-500` `#10B981` | `--success-700` `#047857` |
| Peringatan | `--warning-50` `#FFFBEB` | `--warning-500` `#F59E0B` | `--warning-700` `#B45309` |
| Bahaya | `--danger-50` `#FFF1F2` | `--danger-500` `#F43F5E` | `--danger-700` `#BE123C` |
| Info | `--info-50` `#F0F9FF` | `--info-500` `#0EA5E9` | `--info-700` `#0369A1` |

Tingkat **-500 hanya untuk garis, titik, dan ikon besar** — tidak untuk teks atau latar tombol bertulisan putih.

### 2.4 Netral (slate)

`--neutral-0` putih (kartu) · `-50` `#FAFAFB` (latar aplikasi) · `-100` `#F4F4F7` · `-200` `#E5E7EB` (garis) · `-300` `#D1D5DB` · `-400` `#9CA3AF` (placeholder, ikon redup) · `-500` `#6B7280` (teks sekunder) · `-600` `#4B5563` · `-700` `#374151` (teks isi) · `-800` `#1F2937` · `-900` `#111827` (judul).

### 2.5 Pasangan teks yang dipakai (dicek)

| Pasangan | Rasio |
|---|---|
| Teks isi `-700` di putih | 10,3 : 1 |
| Teks sekunder `-500` di putih / di `-50` | 4,8 / 4,6 : 1 |
| Putih di tombol utama navy | 11,1 : 1 |
| Menu aktif `--primary-700` di `--primary-50` | 14,3 : 1 |
| Tag sukses / peringatan / bahaya / info | 5,2 / 4,8 / 5,7 / 5,6 : 1 |
| Putih di tombol sukses / bahaya (-700) | 5,5 / 6,3 : 1 |
| ✗ Placeholder `-400` (jangan untuk isi) | 2,5 : 1 |

---

## 3. Tipografi

- Huruf: `--font-utama` = Plus Jakarta Sans → Inter → huruf sistem. Cara memuat font di Next.js ⏳ (§13).
- Dasar **14px** (`html { font-size: 14px }`), isi 1rem, garis 1,55.
- Judul halaman 1,75rem/700 · judul kartu 1,1rem/700 · label kapital 0,75rem/600 jarak huruf 0,06em · angka besar 1,85rem/700 `--primary-700`.
- Judul memakai jarak huruf −0,025em. Angka di tabel `tabular-nums`, rata kanan.

## 4. Bentuk, bayangan, jarak

- Radius: `--radius-xs` 6 · `-sm` 10 · `-md` 12 (tombol, isian) · `-lg` 16 (kartu, tabel) · `-xl` 20 · `-2xl` 24 (dialog) · `-full` (tag, avatar).
- Bayangan: `--shadow-sm` kartu · `-md` hover · `-lg` dropdown/toast · `-2xl` dialog · `--shadow-primary` tombol utama · `--shadow-focus` cincin fokus 4px.
- Jarak kelipatan 4px. Padding kartu 24px (HP 16px). Jarak antar kartu 20px.
- Gerak 150–250ms, `--ease-out`. Tombol utama naik 1px saat disorot, komponen lain tidak bergerak. `prefers-reduced-motion` mematikan animasi.

## 5. Ikon

lucide-react, garis 2px, ukuran 16 (dalam teks/tombol), 20 (menu), 24 (empty state). Ikon-saja wajib `aria-label`.

---

## 6. Komponen

Semua aplikasi memakai komponen dari `@siakad/ui` (bungkus PrimeReact 10.9.9). Penyesuaian visual ada di `komponen.css`.

| Komponen | Aturan |
|---|---|
| `Button` | Satu tombol utama (solid) per area. Lainnya `outlined`, `text`, atau `className="p-button-soft"`. Aksi berbahaya `severity="danger"` + konfirmasi. Sedang proses → `loading` (UI-04) |
| `InputText`, `Password`, `InputNumber`, `Dropdown`, `Calendar` | Label di atas, bantuan/kesalahan di bawah. `Password` selalu `toggleMask`. Kolom salah: `className="p-invalid"` + `aria-invalid` + `aria-describedby` |
| `InputOtp` (kode authenticator) | 6 kotak angka, `integerOnly`, `autoComplete="one-time-code"`, tempel kode diizinkan |
| `Message` | Pesan di halaman (kesalahan masuk, akun terkunci). Garis kiri 4px |
| `Toast` | Berhasil saja ("Kata sandi diubah"). Kanan atas, 4 detik |
| `Tag` | Status akun/penugasan: Aktif (success), Nonaktif (secondary), Terkunci (danger), Berakhir (warning), Plt (info) |
| `DataTable` | Daftar pengguna, log, penugasan. Header kapital kecil. Kolom angka `bodyClassName="kanan" headerClassName="kanan"` |
| `Dialog` | Konfirmasi aksi tidak bisa dibatalkan & aksi sensitif dengan alasan (UI-08) |
| `TabView` | Memecah satu halaman (Akun saya: Profil · Keamanan · Perangkat) |

Catatan Prime 10 yang sudah ditangani: sel `DataTable` tidak render ulang bila hanya state luar berubah (bawa status di data baris); `responsiveLayout="stack"` baru aktif setelah update pertama (pakai CSS sendiri untuk HP); `Message` memakai class `.p-inline-message`.

---

## 7. Layout SSO

### 7.1 Layout masuk (tamu)
Dipakai: Masuk, Kode authenticator, Lupa kata sandi, Atur kata sandi baru, Login pertama.
- Latar `--primary-50` + mesh halus; kartu putih di tengah, lebar maks **400px**, radius 16, padding 32 (HP: padding 20).
- Atas kartu: logo kampus + "SSO Univet". Bawah kartu: tautan bantuan kecil `-500`.
- Satu tombol utama selebar kartu.

### 7.2 Layout pengguna (sudah masuk)
Dipakai: Pilih peran, Launcher aplikasi, Akun saya. Topbar 64px (logo, nama peran aktif + **Ganti peran**, avatar → Akun saya / Keluar). Tanpa sidebar. Konten maks 960px di tengah.

### 7.3 Layout Administrasi Aplikasi
`AppShell` sama dengan aplikasi lain (UI-05): topbar 72px blur, sidebar 260px (menu aktif: latar `-50`, teks `-700`, garis kiri 3px `-500`), breadcrumb, header halaman + aksi utama kanan. Menu: Pengguna · Penugasan · Aplikasi · Log masuk · Log perubahan · Laporan · Pengaturan.

---

## 8. Pola halaman SSO

| Halaman | Fitur | Aturan tampilan |
|---|---|---|
| Masuk | A2, A3 | Isian "NIP / NIDN / NIM" + kata sandi; tombol **Masuk**; pemisah "atau"; tombol garis **Masuk dengan akun Google kampus**; tautan "Lupa kata sandi?" |
| Kode authenticator | A4 | Teks "Buka aplikasi authenticator, masukkan 6 angka"; `InputOtp`; tautan "Pakai kode cadangan" |
| Login pertama | ⏳-1, A1 | Langkah 1 Ganti kata sandi → Langkah 2 Lengkapi data. Penanda langkah di atas |
| Lupa / atur kata sandi | A9 | Setelah kirim: pesan sama untuk akun ada/tidak ("Bila akun terdaftar, tautan dikirim ke email…") |
| Pilih peran | A5 | Kartu per peran: nama peran, unit, masa berlaku. Klik = pilih |
| Launcher | A7 | Kisi kartu aplikasi (ikon, nama, deskripsi 1 baris) sesuai peran aktif |
| Akun saya | A8, A10, A11 | Tab Profil · Keamanan (kata sandi, authenticator, kode cadangan) · Perangkat (daftar + **Keluar dari semua perangkat**) |
| Pengguna (admin) | B1–B3, B7, B8 | Tabel: nama, username, peran utama, status (Tag), terakhir masuk. Aksi per baris di menu ⋯ |
| Penugasan (admin) | B4, B5 | Form: orang, aplikasi, peran, unit, mulai–berakhir, centang Plt/Plh |
| Log (admin) | B10, B11 | Tabel waktu, pengguna, aksi, IP, perangkat; filter tanggal |
| Pengaturan (admin) | B12, **B16** | Tab Sesi · Kata sandi · **Tampilan (warna utama)** |
| Banner masuk sebagai | B7 | Pita penuh lebar di atas topbar, latar `--warning-50`, teks `--warning-700`: "Anda masuk sebagai {nama}. Semua perubahan tercatat atas nama Anda dan {nama}." + tombol **Kembali ke akun saya**. Tidak memakai warna utama |

---

## 9. Teks & kosakata

Ikut glosarium UI-11, ditambah:

| Pakai | Jangan |
|---|---|
| **Masuk** / **Keluar** | Login, Logout, Sign in |
| **Kata sandi** | Password, Sandi |
| **Kode authenticator** | OTP, Token, 2FA |
| **Kode cadangan** | Backup code, Recovery code |
| **Ganti peran** | Switch role |
| **Masuk sebagai pengguna lain** | Impersonate |

Pesan baku:
- Gagal masuk: "NIP/NIM atau kata sandi salah." (jangan sebut mana yang salah).
- Terkunci (C6): "Terlalu banyak percobaan. Coba lagi dalam 15 menit." (angka dari pengaturan).
- Kode salah: "Kode tidak cocok atau sudah kedaluwarsa. Coba kode terbaru."

## 10. Aksesibilitas & keamanan tampilan

- `autoComplete`: username → `username`; kata sandi masuk → `current-password`; kata sandi baru → `new-password`; kode → `one-time-code`.
- Jangan blokir tempel (paste) di kolom kata sandi & kode.
- Kesalahan diumumkan (`role="alert"` pada `Message`), fokus pindah ke kolom pertama yang salah.
- Semua alur bisa dengan keyboard; target sentuh ≥ 44px di HP.
- Tidak ada scroll samping di 360px.

---

## 11. File kode & cara pakai

| File | Isi |
|---|---|
| `packages/ui/src/styles.css` | Urutan layer + impor tema, token, komponen, pemetaan Tailwind |
| `packages/ui/src/tema/token.css` | Semua variabel §2–§4 |
| `packages/ui/src/tema/prime-lara-univet.css` | Tema Lara dengan warna utama → variabel (**dibuat otomatis**, `pnpm --filter @siakad/ui buat-tema`) |
| `packages/ui/src/tema/komponen.css` | Penyesuaian komponen Prime §6 |
| `packages/ui/src/tema/warna.ts` | `periksaWarnaUtama`, `buatSkalaWarna`, `cssWarnaUtama`, `PILIHAN_WARNA_UTAMA` (impor server: `@siakad/ui/warna`) |
| `packages/ui/src/tema/gaya-warna-utama.tsx` | `<GayaWarnaUtama warna=… />` |

Tailwind: `bg-primary`, `text-primary-foreground`, `bg-primary-50`, `text-muted-foreground`, `border-border` — semua mengikuti variabel, jadi ikut berganti saat warna utama diganti.

## 12. Perubahan dari v2.2 (disetujui 2026-10-03)

1. Warna status solid & teks memakai **-700** (bukan -500).
2. Ikon **lucide** (bukan Phosphor CDN).
3. Dasar huruf **14px**.
4. Tombol naik **1px**, hanya tombol utama.
5. Isian dengan ikon (cari) diberi ruang kiri 2,6rem.
6. **Warna utama bisa diganti superadmin** (§2.2) — baru di dokumen ini.

## 13. Masih terbuka (⏳)

| # | Pertanyaan |
|---|---|
| ⏳-UI-1 | Warna utama dari SSO berlaku untuk **SSO saja** atau juga dikirim ke siakad/LMS (lewat API pengaturan)? |
| ⏳-UI-2 | Font Plus Jakarta Sans dimuat dengan `next/font` (butuh internet saat build) atau disimpan sendiri di repo? |
| ⏳-UI-3 | Logo kampus resmi (SVG) & favicon. |
