# KAF Workflow (Knowledge-driven Agentic Framework)

Framework Multi-Model SDLC 6 Tahap dengan 3 Human Gates (`9router`: `flash`, `sol`, `claude`) untuk pengembangan aplikasi kampus Univet Bantara.

## Cara Install di Proyek Baru (Untuk AI Agent / Developer)

Jalankan perintah satu baris ini di terminal root proyek tujuan:

```bash
git clone --depth 1 https://github.com/mahfudzshodiq09/kaf-workflow.git .kaf-tmp && node .kaf-tmp/scripts/install-kaf.mjs . && rm -rf .kaf-tmp
```

## Daftar Slash Command (`/kaf-*`)

| Command | Fungsi |
| :--- | :--- |
| `/kaf-status` | Cek daftar tugas (`[x] Selesai` vs `[ ] Belum`), progres modul, & branch aktif |
| `/kaf-1-discovery <slug>` | Tahap 1: Riset Proses Bisnis bahasa manusia & Pilihan Ganda (**Gate 1**) |
| `/kaf-2-spec <slug>` | Tahap 2: Unified Tech Spec, Wireframe 2 Kolom & Tabel Checklist Task (**Gate 2**) |
| `/kaf-3-coding <slug>` | Tahap 3 & 4: Auto-Branch `feat/<slug>`, Sliced Coding (3A/3B/3C), & Auto-Review/Fix |
| `/kaf-4-review <slug>` | Tahap 4: Jalankan ulang pengecekan `tsc --noEmit` & Audit Design System via `sol` |
| `/kaf-6-memory <slug>` | Tahap 6: Update `docs/PROGRESS.md` & otomatis merge `feat/<slug>` ke `main` setelah Lulus UAT (**Gate 3**) |

## Konfigurasi `.env` (Opsional)

```env
NINE_ROUTER_BASE_URL="http://localhost:20128/v1"
NINE_ROUTER_API_KEY="sk-9router"
MODEL_FLASH="ag/gemini-3.8-flash-high"
MODEL_SOL="cx/gpt-6.1-sol"
MODEL_CLAUDE="cc/claude-sonnet-4-5"
```
