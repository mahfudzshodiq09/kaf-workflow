---
name: kaf-3-coding
description: >-
  Jalankan Tahap 3 (Sliced Implementation: 3A Database & Seed, 3B Backend & Zod Logic,
  3C UI PrimeReact) dari Multi-Model KAF Workflow. Gunakan skill ini setelah dokumen
  Tech Spec (docs/specs/<fitur>.md) berstatus Approved di Gate 2.
---

# KAF Tahap 3: Sliced Implementation (`kaf-3-coding`)

Skill ini mengatur langkah kerja **Orchestrator** pada **Tahap 3**. Semua pembuatan kode dijalankan oleh
**satu skrip**: `scripts/kaf-code.mjs`. Skrip inilah yang memanggil model di `9router`, menerapkan kode,
dan menjaga gerbang otomatis — orchestrator **tidak** memanggil `9router.mjs` / `apply-code-bundle.mjs` manual
untuk Tahap 3 (perintah manual melewati semua pengaman di bawah).

| Slice | Isi | Model | File yang boleh ditulis |
|---|---|---|---|
| 3A | Model baru + seeder | `sol` | `prisma/modules/<slug>.prisma` (digabung otomatis ke schema), `prisma/seeds/<slug>.ts` |
| 3B | Zod, aturan murni, actions, tes | `sol` | `src/lib/validations/<slug>.ts`, `src/lib/<slug>/**`, `src/actions/<slug>/**`, `scripts/verify-<slug>-backend.ts` (+ `src/lib/auth.ts` hanya untuk modul pertama) |
| 3C | Halaman & komponen PrimeReact | `claude` | `src/app/<slug>/**`, `src/components/<slug>/**` |

---

## Aturan Hemat Token Mutlak (Zero-Read Thin Orchestrator)
1. **DILARANG `view_file` / `replace_file_content` pada kode (`src/`, `prisma/`).** Isi kode tidak masuk ke chat orchestrator.
2. Cukup jalankan:
   ```bash
   # Semua slice yang belum [x] Selesai (3A -> 3B -> 3C -> 4):
   node scripts/kaf-code.mjs --slug <slug>

   # Nyicil satu slice:
   node scripts/kaf-code.mjs --slug <slug> --slice 3A
   ```
3. Laporkan ke developer hanya ringkasan output skrip (baris `[KAF ...]`, `BERHENTI: ...`, dan daftar file di akhir).

---

## Gerbang Otomatis di `kaf-code.mjs` (0 token AI)
- **Gate 2:** spec wajib berstatus `✅ Disetujui`. Kalau belum → berhenti.
- **Branch:** wajib pindah ke `feat/<slug>`; gagal pindah → berhenti (kode tidak pernah masuk ke `main`).
- **Allowlist path:** bundle yang menulis di luar path slice-nya (mis. `.env`, `schema.prisma`, `auth.ts` bersama) ditolak utuh.
- **Output terpotong / file > 400 baris / file target spec tidak ada:** ditolak utuh, 1x coba ulang otomatis dengan umpan balik ke model, lalu berhenti.
- **Schema bersama:** fragmen digabung dalam blok `// >>> kaf-modul: <slug>`, `prisma format` melengkapi relasi balik, dicek tidak ada model/field lama yang hilang, lalu `validate` + `generate`. Gagal → schema dikembalikan persis.
- **Tes backend:** `scripts/verify-<slug>-backend.ts` wajib lulus setelah 3B. Gagal → berhenti, tidak diperbaiki otomatis.
- **Checkpoint commit** di `feat/<slug>` setelah tiap slice lulus; slice yang gagal tidak dicentang dan tidak di-commit.

## Jika Skrip Berhenti (`[kaf-code] BERHENTI: ...`)
1. Sampaikan pesan BERHENTI apa adanya ke developer (singkat).
2. Jangan memperbaiki kode sendiri. Output model terakhir tersimpan di `docs/specs/.bundle-<tahap>-<slug>.txt` untuk diperiksa developer.
3. Setelah developer memperbaiki (spec / kode / schema manual), jalankan ulang perintah yang sama — slice yang sudah `[x] Selesai` dilewati.

## Langkah Akhir Tahap 3
Mode `ALL` otomatis lanjut ke Tahap 4 (`kaf-4-review`). Jika menjalankan per slice, lanjutkan dengan
`node scripts/kaf-code.mjs --slug <slug> --slice 4` sebelum UAT.
