// embed-client.mjs — a frozen local embedding codec behind a resumable cache. A model call is never repeated: the cache is append-only JSONL
// (sha256(model, prefix, text) -> float32 base64), so a long run that stops resumes where it stopped. No generation, no network but localhost.
import fs from "node:fs";
import crypto from "node:crypto";

const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function makeEmbedder({ model, prefix = "", cacheFile, batch = 32, log = () => {} }) {
  const cache = new Map();
  if (fs.existsSync(cacheFile)) for (const line of fs.readFileSync(cacheFile, "utf8").split("\n")) { if (!line) continue; const t = line.indexOf("\t"); const b = Buffer.from(line.slice(t + 1), "base64"); cache.set(line.slice(0, t), new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4).slice()); }
  const keyOf = (text) => sha(`${model}\n${prefix}\n${text}`);
  let called = 0, t0 = Date.now();
  async function call(texts) {
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        const r = await fetch(`${OLLAMA}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, input: texts.map((t) => prefix + t), keep_alive: "30m" }) });
        if (!r.ok) throw new Error(`embed ${r.status}: ${(await r.text()).slice(0, 200)}`);
        const j = await r.json(); if (!j.embeddings || j.embeddings.length !== texts.length) throw new Error("embed: wrong number of vectors");
        return j.embeddings.map((v) => Float32Array.from(v));
      } catch (e) { log(`embed attempt ${attempt}/6 failed: ${e.message}`); if (attempt === 6) throw e; await sleep(5000 * attempt); }
    }
  }
  /** texts -> Float32Array[] (raw, not normalised), in order; only unseen texts reach the model */
  async function embed(texts) {
    const need = []; const seen = new Set();
    for (const t of texts) { const k = keyOf(t); if (!cache.has(k) && !seen.has(k)) { seen.add(k); need.push(t); } }
    for (let i = 0; i < need.length; i += batch) {
      const chunk = need.slice(i, i + batch), vecs = await call(chunk);
      const lines = []; chunk.forEach((t, j) => { const k = keyOf(t); cache.set(k, vecs[j]); lines.push(`${k}\t${Buffer.from(vecs[j].buffer, vecs[j].byteOffset, vecs[j].byteLength).toString("base64")}`); });
      fs.appendFileSync(cacheFile, lines.join("\n") + "\n"); called += chunk.length;
      if (called % 320 < batch) log(`  ${model}: ${called} new embeddings, ${(called / ((Date.now() - t0) / 1000)).toFixed(1)}/s, ${need.length - i - chunk.length} left in this call`);
    }
    return texts.map((t) => cache.get(keyOf(t)));
  }
  return { embed, size: () => cache.size, modelCalls: () => called };
}
