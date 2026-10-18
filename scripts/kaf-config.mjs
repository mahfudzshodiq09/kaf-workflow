/**
 * Pembaca profil proyek KAF (kaf.config.json) — dipakai kaf-code.mjs & kaf-check.mjs.
 * Profil berisi hal yang berbeda antar proyek: nama aplikasi, stack, design system, mode login,
 * sumber discovery, dan model per tahap. Skrip & skill tidak boleh menulis hal itu secara langsung.
 */
import fs from "node:fs";

export const CONFIG_FILE = "kaf.config.json";

const DEFAULTS = {
  project: { name: "Aplikasi", description: "", language: "Bahasa Indonesia" },
  stack: {
    framework: "Next.js 15 App Router + TypeScript (strict)",
    ui: "PrimeReact 10 + Tailwind CSS",
    icons: "lucide-react",
    database: "PostgreSQL",
    prismaProvider: "postgresql",
    validation: "Zod",
  },
  designSystem: "docs/UI/design_system.md",
  auth: { mode: "demo", roles: ["ADMIN", "ANGGOTA"] },
  discovery: { source: "interview", path: "" },
  models: { discovery: "flash", spec: "sol", database: "sol", backend: "sol", ui: "claude", review: "sol", memory: "flash" },
  maxLines: 400,
};

const AUTH_MODES = ["demo", "existing", "none"];
const PROVIDERS = ["postgresql", "mysql", "sqlite", "sqlserver", "cockroachdb"];
const SOURCES = ["interview", "scrape", "docs"];

/** Baca profil + isi nilai bawaan. required=true → error bila file tidak ada atau isinya tidak valid. */
export function readConfig({ required = false } = {}) {
  if (!fs.existsSync(CONFIG_FILE)) {
    if (required) throw new Error(`${CONFIG_FILE} belum ada di root proyek. Salin dari kit KAF lalu isi profil proyekmu.`);
    return structuredClone(DEFAULTS);
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (err) {
    throw new Error(`${CONFIG_FILE} bukan JSON valid: ${err.message}`);
  }
  const cfg = {
    ...DEFAULTS,
    ...raw,
    project: { ...DEFAULTS.project, ...raw.project },
    stack: { ...DEFAULTS.stack, ...raw.stack },
    auth: { ...DEFAULTS.auth, ...raw.auth },
    discovery: { ...DEFAULTS.discovery, ...raw.discovery },
    models: { ...DEFAULTS.models, ...raw.models },
  };
  const problems = [];
  if (!AUTH_MODES.includes(cfg.auth.mode)) problems.push(`auth.mode harus salah satu: ${AUTH_MODES.join(", ")}`);
  if (!PROVIDERS.includes(cfg.stack.prismaProvider)) problems.push(`stack.prismaProvider harus salah satu: ${PROVIDERS.join(", ")}`);
  if (!SOURCES.includes(cfg.discovery.source)) problems.push(`discovery.source harus salah satu: ${SOURCES.join(", ")}`);
  if (!Number.isInteger(cfg.maxLines) || cfg.maxLines < 100) problems.push("maxLines harus bilangan bulat >= 100");
  if (problems.length > 0) throw new Error(`${CONFIG_FILE} tidak valid: ${problems.join("; ")}`);
  return cfg;
}

/** Kalimat penjelasan login sesuai auth.mode — disisipkan ke prompt model. */
export function describeAuth(cfg) {
  if (cfg.auth.mode === "none") return "Tanpa login (aplikasi satu pengguna): JANGAN membuat sistem login, peran, maupun guard peran.";
  if (cfg.auth.mode === "existing") return "Login memakai sistem yang SUDAH ADA di src/lib/auth.ts: import fungsinya, JANGAN membuat atau menulis ulang auth.";
  return `Simulasi login untuk uji coba: Role Switcher (cookie demo_user_id, otomatis mati di production) dengan peran: ${cfg.auth.roles.join(", ")}.`;
}

/** Ringkasan profil proyek satu paragraf untuk prompt model. */
export function describeProject(cfg) {
  const s = cfg.stack;
  return (
    `Proyek: ${cfg.project.name}${cfg.project.description ? ` — ${cfg.project.description.replace(/[.\s]+$/, "")}` : ""}. ` +
    `Stack: ${s.framework}; UI ${s.ui}; ikon ${s.icons}; database ${s.database} lewat Prisma; validasi ${s.validation}. ` +
    `Bahasa tampilan: ${cfg.project.language}. Design system: ${cfg.designSystem}. ${describeAuth(cfg)}`
  );
}
