# KAF Workflow — General (Knowledge-driven Agentic Framework)

Framework SDLC 6 tahap dengan 3 Human Gate dan model berlapis lewat `9router` (`flash`, `sol`, `claude`) untuk
**proyek apa pun** berbasis Next.js + Prisma + TypeScript. Semua hal yang khas proyek (nama, stack UI, database,
design system, mode login, sumber discovery) diatur di **`kaf.config.json`**.

> Branch `main` = versi khusus SIAKAD Univet. Branch `general` (ini) = versi umum.

## Cara Pasang

### Proyek baru (mis. Kanban)
```bash
npx create-next-app@15 kanban-tim --ts --app --src-dir --tailwind --eslint --import-alias "@/*"
cd kanban-tim
npm i @prisma/client zod primereact primeicons lucide-react
npm i -D prisma tsx
npx prisma init --datasource-provider postgresql
```

### Pasang KAF (proyek baru maupun yang sudah ada)
```bash
git clone --depth 1 -b general https://github.com/mahfudzshodiq09/kaf-workflow.git .kaf-tmp \
  && node .kaf-tmp/scripts/install-kaf.mjs . && rm -rf .kaf-tmp
git add -A && git commit -m "chore: pasang KAF Workflow"
```
Installer **tidak menimpa** `kaf.config.json`, `docs/UI/design_system.md`, atau `AGENTS.md` milik proyek
(AGENTS.md non-KAF yang sudah ada → aturan KAF ditulis ke `AGENTS.kaf.md`).

## Isi Profil `kaf.config.json`
| Kunci | Isi |
|---|---|
| `project` | Nama, satu kalimat tujuan, bahasa tampilan |
| `stack` | Framework, library UI, ikon, database, `prismaProvider` (`postgresql`/`mysql`/`sqlite`/`sqlserver`/`cockroachdb`), validasi |
| `designSystem` | Path dokumen tampilan (bawaan `docs/UI/design_system.md`, template netral — sesuaikan brand) |
| `auth.mode` | `demo` (Role Switcher uji coba, peran dari `auth.roles`) · `existing` (pakai `src/lib/auth.ts` yang ada) · `none` (tanpa login) |
| `discovery.source` | `interview` (wawancara pilihan ganda) · `scrape` (HTML di `discovery.path`) · `docs` (.md/.txt di `discovery.path`) |
| `models` | Peran model 9router per tahap (`discovery`, `spec`, `database`, `backend`, `ui`, `review`, `memory`) |
| `maxLines` | Batas baris per file `.ts/.tsx` di `src/` (bawaan 400) |

## Perintah (`/kaf-*`)
| Command | Fungsi |
| :--- | :--- |
| `/kaf-status` | Daftar tugas `[x]`/`[ ]`, progres modul, branch aktif (0 token) |
| `/kaf-1-discovery <slug>` | Tahap 1: proses bisnis bahasa manusia dari wawancara/scrape/dokumen + pilihan ganda (**Gate 1**) |
| `/kaf-2-spec <slug>` | Tahap 2: Unified Tech Spec + wireframe + tabel checklist (**Gate 2**) |
| `/kaf-3-coding <slug>` | Tahap 3 & 4 lewat `node scripts/kaf-code.mjs --slug <slug>` dengan gerbang otomatis |
| `/kaf-4-review <slug>` | Tahap 4 saja: tsc, tes backend, `kaf-check`, audit |
| `/kaf-6-memory <slug>` | Tahap 6: update `docs/PROGRESS.md` & merge `feat/<slug>` ke `main` setelah lulus UAT (**Gate 3**) |

Cek statis kapan saja tanpa token: `node scripts/kaf-check.mjs --slug <slug>`.

## Gerbang Otomatis `kaf-code.mjs`
- Spec wajib `✅ Disetujui` (Gate 2) · wajib branch `feat/<slug>` · checkpoint commit per slice.
- Model hanya boleh menulis path modulnya; `.env`, `package.json`, `kaf.config.json`, auth & schema bersama terkunci.
- Schema: model baru ditulis sebagai fragmen lalu digabung aditif ke `prisma/schema.prisma` (model lama tidak bisa hilang).
- Output terpotong / file > `maxLines` / file target spec hilang → ditolak utuh, 1x coba ulang, lalu berhenti.
- `scripts/verify-<slug>-backend.ts` wajib lulus · `tsc` 0 error · `kaf-check` bersih (file kecil, tanpa `any`, tabel lazy).

## Konfigurasi `.env` (9router)
```env
NINE_ROUTER_BASE_URL="http://localhost:20128/v1"
NINE_ROUTER_API_KEY="sk-9router"
MODEL_FLASH="ag/gemini-3.8-flash-high"
MODEL_SOL="cx/gpt-6.1-sol"
MODEL_CLAUDE="cc/claude-sonnet-4-5"
# Opsional: batas output per panggilan model
MAX_OUTPUT_TOKENS=""
```

## Batasan Versi Ini
- Mode **brownfield** (mengubah tabel/file lama) belum ada: kaf hanya menambah modul baru. Perubahan model lama
  ditulis di spec sebagai "Perubahan Model Lama (Manual)" dan dikerjakan developer.
- Skrip mengasumsikan Next.js + Prisma + TypeScript dengan folder `src/` dan `prisma/` di root proyek.
