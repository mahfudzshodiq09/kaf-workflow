#!/usr/bin/env node
/**
 * 9router Dispatcher CLI
 * Jembatan antara Main Agent (Orchestrator) dengan model di 9router:
 * - gemini-3.8-flash (Discovery, UI PrimeReact, Docs/Memory)
 * - gpt-6.1-sol      (Tech Spec, DB/Backend Logic, Code Review)
 *
 * Cara pakai:
 *   node scripts/9router.mjs --test
 *   node scripts/9router.mjs --role flash --prompt "Jelaskan..." --files "file1.md,file2.csv" --out "docs/discovery/krs.md"
 *   node scripts/9router.mjs --role sol --prompt "Review kode ini..." --files "src/actions/krs.ts"
 */

import fs from 'node:fs';
import path from 'node:path';

// Load .env manual (zero dependency)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const CONFIG = {
  baseUrl: process.env.NINE_ROUTER_BASE_URL || 'http://localhost:20128/v1',
  apiKey: process.env.NINE_ROUTER_API_KEY || 'sk-9router',
  models: {
    flash: process.env.MODEL_FLASH || 'gemini-3.8-flash',
    sol: process.env.MODEL_SOL || 'gpt-6.1-sol',
    claude: process.env.MODEL_CLAUDE || process.env.MODEL_FLASH || 'gemini-3.8-flash',
  },
  // Opsional: batas output per panggilan (MAX_OUTPUT_TOKENS di .env). Kosong = bawaan provider.
  maxTokens: Number(process.env.MAX_OUTPUT_TOKENS) || 0,
};

function parseArgs(argv) {
  const args = {
    test: false,
    listModels: false,
    role: 'flash', // 'flash' | 'sol' | nama model langsung
    system: '',
    prompt: '',
    promptFile: '',
    files: [],
    out: '',
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--test') args.test = true;
    else if (a === '--models') args.listModels = true;
    else if (a === '--role' || a === '--model') args.role = argv[++i];
    else if (a === '--system') args.system = argv[++i];
    else if (a === '--prompt') args.prompt = argv[++i];
    else if (a === '--prompt-file') args.promptFile = argv[++i];
    else if (a === '--files') args.files = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--out') args.out = argv[++i];
  }
  return args;
}

async function listModels() {
  const url = `${CONFIG.baseUrl.replace(/\/$/, '')}/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${CONFIG.apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

async function callChatCompletion({ model, system, userContent }) {
  const url = `${CONFIG.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userContent });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      stream: false,
      ...(CONFIG.maxTokens ? { max_tokens: CONFIG.maxTokens } : {}),
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`9router Error (${res.status}) pada model [${model}]: ${rawText}`);
  }

  // Handle baik JSON standar maupun SSE stream ("data: {...}") dari provider tertentu di 9router
  const trimmed = rawText.trim();
  if (trimmed.startsWith('data:')) {
    let fullContent = '';
    let finishReason = '';
    for (const line of trimmed.split('\n')) {
      const clean = line.trim();
      if (!clean.startsWith('data:')) continue;
      const payload = clean.slice(5).trim();
      if (payload === '[DONE]') break;
      try {
        const parsed = JSON.parse(payload);
        const delta =
          parsed.choices?.[0]?.delta?.content ??
          parsed.choices?.[0]?.message?.content ??
          '';
        fullContent += delta;
        finishReason = parsed.choices?.[0]?.finish_reason || finishReason;
      } catch {
        // abaikan baris non-JSON
      }
    }
    return { content: fullContent, finishReason };
  }

  const data = JSON.parse(trimmed);
  return {
    content: data.choices?.[0]?.message?.content || '',
    finishReason: data.choices?.[0]?.finish_reason || '',
  };
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.listModels) {
    console.log(`Mengecek daftar model di ${CONFIG.baseUrl}/models ...`);
    const models = await listModels();
    const ids = (models.data || []).map((m) => m.id);
    console.log('Available Model IDs:', ids.join(', '));
    return;
  }

  if (args.test) {
    console.log('=== TEST KONEKSI 9ROUTER ===');
    console.log(`Base URL : ${CONFIG.baseUrl}`);
    console.log(`Flash ID : ${CONFIG.models.flash}`);
    console.log(`Sol ID   : ${CONFIG.models.sol}\n`);

    for (const [key, modelName] of Object.entries(CONFIG.models)) {
      process.stdout.write(`Testing [${key}] (${modelName})... `);
      try {
        const reply = await callChatCompletion({
          model: modelName,
          userContent: 'Balas dengan satu kalimat singkat: "Koneksi 9router siap!" beserta nama modelmu.',
        });
        console.log(`BERHASIL!\n  Respon: ${reply.content.trim()}\n`);
      } catch (err) {
        console.log(`GAGAL!\n  Error: ${err.message}\n`);
      }
    }
    return;
  }

  const targetModel = CONFIG.models[args.role] || args.role;
  let promptText = args.prompt;
  if (args.promptFile) {
    promptText = fs.readFileSync(path.resolve(process.cwd(), args.promptFile), 'utf-8');
  }

  if (!promptText) {
    console.error('Error: --prompt atau --prompt-file wajib diisi (atau gunakan --test).');
    process.exit(1);
  }

  // Gabungkan isi file konteks jika ada (--files)
  let contextBlocks = '';
  for (const fileRel of args.files) {
    const fullPath = path.resolve(process.cwd(), fileRel);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      contextBlocks += `\n\n--- FILE: ${fileRel} ---\n${content}\n--- END FILE: ${fileRel} ---`;
    } else {
      console.warn(`Warning: File konteks tidak ditemukan: ${fileRel}`);
    }
  }

  const finalUserContent = contextBlocks
    ? `${promptText}\n\nBerikut adalah referensi file konteks:${contextBlocks}`
    : promptText;

  console.log(`[9router] Mengirim tugas ke model: ${targetModel}...`);
  const { content: result, finishReason } = await callChatCompletion({
    model: targetModel,
    system: args.system,
    userContent: finalUserContent,
  });

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, result, 'utf-8');
    console.log(`[9router] Output berhasil disimpan ke: ${args.out}`);
  } else {
    console.log('\n--- OUTPUT MODEL ---\n');
    console.log(result);
  }

  // Jawaban berhenti karena batas panjang = hasil TIDAK lengkap, walau blok yang ada terlihat rapi.
  if (finishReason === 'length') {
    console.error('KAF_TRUNCATED: model berhenti karena batas panjang output (finish_reason=length). Hasil tidak lengkap.');
    process.exit(3);
  }
}

main().catch((err) => {
  console.error('[9router Fatal Error]:', err.message);
  process.exit(1);
});
