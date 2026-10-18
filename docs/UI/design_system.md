# Design System — [Nama Aplikasi]

> **Status:** Template awal KAF — **ganti nilai di bawah sesuai brand proyekmu** sebelum Tahap 3.
> Ini **satu-satunya acuan tampilan**. Bila kode dan dokumen ini berbeda, dokumen ini yang benar. Ubah dokumen dulu, baru kode.

---

## 0. Ringkas

| Hal | Nilai |
|---|---|
| Warna utama | Indigo `#4F46E5` (ganti sesuai brand) |
| Warna status | sukses `#047857`, peringatan `#B45309`, bahaya `#BE123C`, info `#0369A1` (teks & tombol solid) |
| Huruf | Inter → huruf sistem, dasar 14px |
| Radius | tombol & isian 10px · kartu 14px · dialog 20px · tag pill |
| Komponen | sesuai `stack.ui` di `kaf.config.json` |
| Ikon | sesuai `stack.icons` (garis 2px, ukuran 16 / 20 / 24) |
| Kontras | Semua teks ≥ 4,5 : 1 (WCAG 2.2 AA) |

---

## 1. Prinsip
1. **Tenang & jelas:** satu tugas utama per layar, tanpa animasi atau warna yang ramai.
2. **Konsisten:** komponen, istilah, dan warna status sama di seluruh aplikasi.
3. **Jelas saat gagal:** pesan kesalahan memberi tahu apa yang bisa dilakukan pengguna.
4. **Responsif:** nyaman di HP (360px tanpa scroll samping) dan desktop.

---

## 2. Warna (variabel CSS — halaman tidak boleh menulis hex)

### 2.1 Warna utama
| Variabel | Hex | Dipakai untuk |
|---|---|---|
| `--primary-50` | `#EEF2FF` | latar lembut, menu aktif, sorot baris |
| `--primary-100` | `#E0E7FF` | hover tombol lembut |
| `--primary-500` | `#4F46E5` | tombol utama, tautan, fokus |
| `--primary-600` | `#4338CA` | hover tombol utama |
| `--primary-700` | `#3730A3` | teks di atas `-50` |

### 2.2 Warna status
| Status | Latar lembut | Garis/titik | Teks & tombol solid |
|---|---|---|---|
| Sukses | `--success-50` `#ECFDF5` | `--success-500` `#10B981` | `--success-700` `#047857` |
| Peringatan | `--warning-50` `#FFFBEB` | `--warning-500` `#F59E0B` | `--warning-700` `#B45309` |
| Bahaya | `--danger-50` `#FFF1F2` | `--danger-500` `#F43F5E` | `--danger-700` `#BE123C` |
| Info | `--info-50` `#F0F9FF` | `--info-500` `#0EA5E9` | `--info-700` `#0369A1` |

Tingkat **-500 hanya untuk garis, titik, dan ikon besar** — bukan untuk teks atau latar tombol bertulisan putih.

### 2.3 Netral
`--neutral-0` putih (kartu) · `-50` `#FAFAFB` (latar aplikasi) · `-200` `#E5E7EB` (garis) · `-400` `#9CA3AF` (placeholder) ·
`-500` `#6B7280` (teks sekunder) · `-700` `#374151` (teks isi) · `-900` `#111827` (judul).

---

## 3. Tipografi
- Huruf `--font-utama`: Inter → huruf sistem. Dasar **14px**, garis 1,55.
- Judul halaman 1,75rem/700 · judul kartu 1,1rem/700 · label kapital 0,75rem/600 (jarak huruf 0,06em).
- Angka di tabel `tabular-nums`, rata kanan.

## 4. Bentuk, bayangan, jarak
- Radius: `--radius-sm` 10 (tombol, isian) · `--radius-md` 14 (kartu, tabel) · `--radius-lg` 20 (dialog) · `--radius-full` (tag, avatar).
- Jarak kelipatan 4px. Padding kartu 20px (HP 16px). Jarak antar kartu 16px.
- Gerak 150–250ms; `prefers-reduced-motion` mematikan animasi.

## 5. Komponen (aturan umum)
| Komponen | Aturan |
|---|---|
| Tombol | Satu tombol utama per area; lainnya sekunder/outline/teks. Aksi berbahaya = varian bahaya + konfirmasi. Saat proses → loading. |
| Isian | Label di atas, bantuan/kesalahan di bawah; field salah ditandai + `aria-invalid`. |
| Notifikasi (toast) | Hasil aksi; kanan atas, ±4 detik. |
| Tag status | info = baru/draf · warning = menunggu/proses · success = selesai/aktif · danger = ditolak/terlambat. |
| Tabel | Header kapital kecil, baris bergaris tipis, paginasi di server untuk data database. |
| Dialog | Konfirmasi aksi yang tidak bisa dibatalkan, form singkat. |

## 6. Layout
- Topbar 64px + konten maks 1280px di tengah; sidebar opsional 240px (menu aktif: latar `--primary-50`, teks `--primary-700`).
- Setiap halaman: breadcrumb → judul + deskripsi 1 baris → aksi utama di kanan.

## 7. Teks & kosakata
Ikuti `project.language`. Contoh Bahasa Indonesia: **Masuk / Keluar** (bukan Login / Logout), **Simpan**, **Batal**, **Hapus**,
**Ganti peran** (bukan Switch role). Pesan kosong informatif: "Belum ada tugas. Tambahkan tugas pertama." (bukan "No records found").

## 8. Aksesibilitas
Semua alur bisa dengan keyboard; fokus terlihat; target sentuh ≥ 44px di HP; tombol hanya-ikon wajib `aria-label`.
