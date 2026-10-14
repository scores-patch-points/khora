#!/usr/bin/env node
// follow-index.mjs — an encyclopedia is an INDEX: follow the footnotes under the sentences the answers leaned on, and pin the pages they name.
//
//   node native/scripts/follow-index.mjs --out DIR [--max-per-claim 3]
//
// DIR is a record written by callimachus-run.mjs (record.json, answers.json, layers/). For every sentence an answer showed from an index page
// (index-source.js isIndexUrl), the footnotes standing under it are read from the page's own pinned bytes (footnotesOf, marksOf, trailOf),
// the origin pages they name are fetched, pinned like any source (their seed records the path: `index:<pinax>/raw#b<start>-<end>:n<k>`), and
// appended to record.json. The next `callimachus-run.mjs --replay` reads them as ordinary sources and cites their authors and speakers.
//
// The follow is mechanical and bounded by a rule that already existed: at most MAX_ORIGINS_PER_CLAIM footnotes per claim (the-fold
// fold-chat-origin.js ORIGIN.maxAttempts). An origin that cannot be read is a typed absence (bot_blocked, unreachable, challenge_or_shell),
// never silence, and never replaced by a guess. A cached fetch (DIR/origins/<sha12 of url>.{raw,txt}) is reused so a rerun is the same bytes.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { footnotesOf, marksOf, trailOf, isIndexUrl, MAX_ORIGINS_PER_CLAIM } from "../organs/index-source.js";
import { makePinax, parseAddress } from "../organs/pinax.js";
import { extractText, declaredOf } from "../organs/callimachus.js";
import { WEB_UA, WEB_FETCH_TIMEOUT_MS, BLOCKED_STATUSES, looksLikeChallenge } from "../organs/web.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = resolve(opt("--out") ?? "");
if (!opt("--out")) { console.error("--out DIR is required"); process.exit(2); }
const maxPer = Number(opt("--max-per-claim", MAX_ORIGINS_PER_CLAIM));
const rec = JSON.parse(readFileSync(join(out, "record.json"), "utf8"));
if (!existsSync(join(out, "answers.json"))) { console.error("answers.json is missing: run the ladder first so the sentences the answers lean on are known"); process.exit(2); }
const answers = JSON.parse(readFileSync(join(out, "answers.json"), "utf8"));
const EXTRACTOR = { name: "web.js#extractReadable", sha256: createHash("sha256").update(readFileSync(join(here, "../organs/web.js"))).digest("hex") };
const enc = new TextEncoder(), dec = new TextDecoder();
const u16 = (text, byteOff) => dec.decode(enc.encode(text).subarray(0, byteOff)).length;

// 1. the index pages, from their pinned bytes
const index = {};
for (const s of rec.sources.filter((x) => isIndexUrl(x.final_url ?? x.url))) {
  const raw = readFileSync(join(out, "layers", `${s.id}.raw`), "utf8"), text = readFileSync(join(out, "layers", `${s.id}.txt`), "utf8");
  index[s.id] = { raw, text, footnotes: footnotesOf(raw), marks: marksOf(text) };
}

// 2. the index sentences the answers showed (line, paragraph, brief), as spans of their text layers
const shown = new Map();
for (const l of answers) for (const st of l.stages.slice(0, 3)) for (const sg of st.segments ?? []) for (const g of sg) {
  if (g.kind !== "source" || !g.address) continue;
  const p = parseAddress(g.address);
  if (index[p.pinax] && p.layer === "text") shown.set(`${p.pinax}#${p.start}-${p.end}`, p);
}
const sentenceOf = (pinax, b0, b1) => {
  const T = index[pinax].text, a = u16(T, b0), b = u16(T, b1);
  const s0 = Math.max(T.lastIndexOf(". ", a) + 2, T.lastIndexOf("\n", a) + 1, 0);
  let s1 = T.indexOf(". ", b); s1 = s1 < 0 ? T.length : s1 + 1;
  return [s0, s1];
};
const claims = [];
for (const c of shown.values()) {
  const span = sentenceOf(c.pinax, c.start, c.end);
  const ix = index[c.pinax];
  claims.push({ pinax: c.pinax, span, trail: trailOf({ text: ix.text, footnotes: ix.footnotes, marks: ix.marks, span, pinax: c.pinax }) });
}
const targets = new Map();
for (const c of claims) for (const f of c.trail.follow.slice(0, maxPer)) if (!targets.has(f.href)) targets.set(f.href, { ...f, pinax: c.pinax });
console.error(`index sentences shown: ${claims.length} · with a footnote origin: ${claims.filter((c) => c.trail.follow.length).length} · distinct origins: ${targets.size}`);

// 3. fetch (cached), pin, append
mkdirSync(join(out, "origins"), { recursive: true });
const get = async (url) => {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), WEB_FETCH_TIMEOUT_MS);
  try { const r = await fetch(url, { headers: { "user-agent": `${WEB_UA} callimachus-index-follow`, accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: ctl.signal });
    return { ok: r.ok, status: r.status, ct: r.headers.get("content-type") ?? "", raw: new Uint8Array(await r.arrayBuffer()), final: r.url }; }
  catch (e) { return { ok: false, status: 0, err: String(e.message ?? e) }; } finally { clearTimeout(t); }
};
const have = new Set(rec.sources.map((s) => s.final_url ?? s.url));
const list = [...targets.values()];
const results = [];
let next = 0;
async function worker() {
  while (next < list.length) {
    const f = list[next++];
    const id = createHash("sha256").update(f.href).digest("hex").slice(0, 12);
    const cache = { raw: join(out, "origins", `${id}.raw`), txt: join(out, "origins", `${id}.txt`) };
    let raw, text, status = 200, ct = "text/html", final = f.href, kind = "ok";
    if (existsSync(cache.raw) && existsSync(cache.txt)) { raw = new Uint8Array(readFileSync(cache.raw)); text = readFileSync(cache.txt, "utf8"); }
    else {
      const r = await get(f.href); status = r.status; ct = r.ct; final = r.final ?? f.href;
      if (!r.ok) kind = r.status === 0 ? "unreachable" : BLOCKED_STATUSES.includes(r.status) ? "bot_blocked" : `http_${r.status}`;
      else if (!/html|xml|text/i.test(r.ct)) kind = "unadmitted";
      else { const html = dec.decode(r.raw); text = extractText(html); raw = r.raw;
        if (looksLikeChallenge({ title: html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "", textChars: text.length }) || text.length < 400) kind = "bot_blocked"; }
      if (kind === "ok") { writeFileSync(cache.raw, raw); writeFileSync(cache.txt, text); }
    }
    results.push({ ...f, id, kind, status, ct, final, raw, text });
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

let added = 0;
const now = new Date().toISOString();
for (const r of results.sort((a, b) => a.href.localeCompare(b.href))) {
  if (r.kind !== "ok") { rec.absences.push({ type: r.kind, url: r.href, detail: `index follow from ${r.pinax} footnote ${r.n} (HTTP ${r.status})` }); continue; }
  if (have.has(r.final) || have.has(r.href)) continue; // already a source of this record
  const p = await makePinax({ url: r.href, finalUrl: r.final, retrievedAt: now, fetch: { status: r.status, content_type: r.ct, via: "node fetch", seed: `index:${r.via}:n${r.n}` }, raw: r.raw, text: r.text, extractor: EXTRACTOR });
  if (rec.sources.some((s) => s.id === p.entry.id)) continue;
  writeFileSync(join(out, "layers", `${p.entry.id}.raw`), p.layers.raw);
  writeFileSync(join(out, "layers", `${p.entry.id}.txt`), p.layers.text);
  // The declared page facts (published, links) are read from the raw markup, exactly as for any source.
  rec.sources.push({ ...p.entry, declared: declaredOf(dec.decode(r.raw)), role: "source" });
  rec.collection.seeds.push({ url: r.href, seed: `index:${r.via}:n${r.n}` });
  have.add(r.href); added++;
}
rec.collection.index_follow = { at: now, claims: claims.length, with_origin: claims.filter((c) => c.trail.follow.length).length, origins_tried: list.length, pinned: added, max_per_claim: maxPer, rule: "an encyclopedia is an index, never a source (index-source.js)" };
writeFileSync(join(out, "record.json"), JSON.stringify(rec, null, 1));
const by = results.reduce((m, r) => ((m[r.kind] = (m[r.kind] ?? 0) + 1), m), {});
console.log(JSON.stringify({ out, index_sentences: claims.length, with_origin: claims.filter((c) => c.trail.follow.length).length, origins: list.length, outcomes: by, pinned: added }));
