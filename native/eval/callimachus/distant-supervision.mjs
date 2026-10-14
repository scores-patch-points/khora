#!/usr/bin/env node
// distant-supervision.mjs — runs DISTANT-SUPERVISION-PREREG.md exactly as written. No parameter below is chosen after a result.
//   node native/eval/callimachus/distant-supervision.mjs --out DIR [--topics "a|b"] [--dry]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stancesOf, STANCE_FRAMES, predicateKind } from "../../organs/perspectives.js";
import { probeQuestions } from "../../organs/stance-probes.js";
import { extractText } from "../../organs/callimachus.js";
import { WEB_UA, WEB_FETCH_TIMEOUT_MS, looksLikeChallenge, parseSearchResults } from "../../organs/web.js";
import { isIndexUrl } from "../../organs/index-source.js";
import { loadModel, seeded } from "../../adapters/text/english-parser.js";
import { splitSentences } from "../../adapters/text/spans.js";

const here = dirname(fileURLToPath(import.meta.url)), R = join(here, "../../");
const args = process.argv.slice(2), opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = resolve(opt("--out", join(R, "../../callimachus-runs/distant-supervision")));
const topics = (opt("--topics", "permanent daylight saving time|universal basic income")).split("|");
const MAX_SEARCHES = 8, PER_SEARCH = 3, MAX_FETCHES = 24, DRAWS = 999;
mkdirSync(join(out, "cache"), { recursive: true });
const model = loadModel(JSON.parse(readFileSync(join(R, "priors/parser-eng-ewt.json"), "utf8")), { morphology: JSON.parse(readFileSync(join(R, "priors/morphology-eng.json"), "utf8")) });
const actPrior = JSON.parse(readFileSync(join(R, "priors/act-prior-en.json"), "utf8"));
const dec = new TextDecoder();
const get = async (url) => {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), WEB_FETCH_TIMEOUT_MS);
  try { const r = await fetch(url, { headers: { "user-agent": `${WEB_UA} callimachus-distant-supervision`, accept: "text/html" }, redirect: "follow", signal: ctl.signal }); return { ok: r.ok, status: r.status, raw: new Uint8Array(await r.arrayBuffer()), ct: r.headers.get("content-type") ?? "" }; }
  catch (e) { return { ok: false, status: 0 }; } finally { clearTimeout(t); }
};
const cached = async (url) => {
  const id = createHash("sha256").update(url).digest("hex").slice(0, 12), f = join(out, "cache", `${id}.txt`);
  if (existsSync(f)) return readFileSync(f, "utf8");
  const r = await get(url);
  if (!r.ok || !/html|xml|text/i.test(r.ct)) return null;
  const html = dec.decode(r.raw), text = extractText(html);
  if (looksLikeChallenge({ title: html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "", textChars: text.length }) || text.length < 400) return null;
  writeFileSync(f, text); return text;
};

const perTopic = {};
for (const topic of topics) {
  const probes = probeQuestions(topic, { frames: { pro: [], con: [] } }); // the eight templated questions only (no frame-lemma probes)
  const con = probes.filter((p) => p.pole === "con").slice(0, 4), pro = probes.filter((p) => p.pole === "pro").slice(0, 4);
  const pages = new Map(); // url -> { side, text }
  let searches = 0, fetches = 0;
  for (const p of [...con, ...pro]) {
    if (searches >= MAX_SEARCHES) break; searches++;
    const r = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(p.q)}`);
    const parsed = r.ok ? parseSearchResults(dec.decode(r.raw)) : { results: [] };
    for (const res of parsed.results.slice(0, PER_SEARCH)) {
      if (pages.has(res.url) || isIndexUrl(res.url) || fetches >= MAX_FETCHES) continue;
      fetches++; const text = await cached(res.url);
      if (text) pages.set(res.url, { side: p.pole, text });
    }
  }
  const names = [topic.toLowerCase()];
  const preds = new Map(); // lemma -> { con:Set, pro:Set }
  let nCon = 0, nPro = 0;
  for (const [url, pg] of pages) {
    const low = pg.text.toLowerCase();
    if (!names.some((n) => low.includes(n))) continue;
    if (pg.side === "con") nCon++; else nPro++;
    for (const sn of splitSentences(pg.text)) {
      const t = sn.text.trim(); if (t.length < 20 || t.length > 400 || !names.some((n) => t.toLowerCase().includes(n))) continue;
      let rs; try { rs = stancesOf(t, "x", { model, focusSurfaces: names }); } catch { continue; }
      for (const r of rs) {
        if (r.refusal || !r.holder?.text) continue;
        if (!preds.has(r.pred)) preds.set(r.pred, { con: new Set(), pro: new Set() });
        preds.get(r.pred)[pg.side].add(url);
      }
    }
  }
  const urls = [...pages].filter(([, p]) => names.some((n) => p.text.toLowerCase().includes(n))).map(([u, p]) => [u, p.side]);
  const score = (L, labels) => {
    const e = preds.get(L); let c = 0, p = 0;
    for (const u of e.con) if (labels.get(u) === "con") c++; else p++;
    for (const u of e.pro) if (labels.get(u) === "con") c++; else p++;
    return Math.log((c + 0.5) / (nCon + 1)) - Math.log((p + 0.5) / (nPro + 1));
  };
  const real = new Map(urls);
  const rnd = seeded(`ds-${topic}`);
  const maxes = [];
  for (let d = 0; d < DRAWS; d++) {
    const sides = urls.map(([, s]) => s); for (let i = sides.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sides[i], sides[j]] = [sides[j], sides[i]]; }
    const labels = new Map(urls.map(([u], i) => [u, sides[i]]));
    let m = 0; for (const L of preds.keys()) m = Math.max(m, Math.abs(score(L, labels))); maxes.push(m);
  }
  maxes.sort((a, b) => a - b); const cut = maxes[Math.floor(0.95 * (maxes.length - 1))] ?? Infinity;
  const admitted = [...preds.keys()].map((L) => ({ L, s: score(L, real), n: preds.get(L).con.size + preds.get(L).pro.size, kind: predicateKind(actPrior, L) })).filter((x) => Math.abs(x.s) > cut).sort((a, b) => Math.abs(b.s) - Math.abs(a.s));
  perTopic[topic] = { searches, fetches, pages_on_topic: urls.length, nCon, nPro, predicates: preds.size, cut: +cut.toFixed(3), admitted: admitted.map((x) => ({ lemma: x.L, sign: x.s > 0 ? "con" : "pro", score: +x.s.toFixed(3), pages: x.n, kind: x.kind })) };
  console.error(`${topic}: ${urls.length} pages (${nCon} con / ${nPro} pro), ${preds.size} predicates, cut ${cut.toFixed(2)}, admitted ${admitted.length}`);
}
// acceptance
const T = Object.values(perTopic);
const A = T.map((t) => t.admitted);
const a = A.every((x) => x.length > 0);
const frameLemma = (l) => (STANCE_FRAMES.pro.includes(l) ? "pro" : STANCE_FRAMES.con.includes(l) ? "con" : null);
const contradictions = A.flat().filter((x) => frameLemma(x.lemma) && frameLemma(x.lemma) !== x.sign);
const b = contradictions.length === 0;
const c = A.flat().some((x) => x.kind === "event");
const both = A[0]?.filter((x) => A[1]?.some((y) => y.lemma === x.lemma)) ?? [];
const d = both.every((x) => A[1].find((y) => y.lemma === x.lemma).sign === x.sign);
const verdict = { a_admitted_in_every_topic: a, b_no_frame_contradiction: b, c_event_predicate_admitted: c, d_cross_topic_sign_stable: d, contradictions, shared: both.map((x) => x.lemma), derived_seed_admitted: a && b && d, event_verb_gap_closed: a && b && c && d };
writeFileSync(join(out, "result.json"), JSON.stringify({ prereg: "DISTANT-SUPERVISION-PREREG.md", perTopic, verdict }, null, 1));
console.log(JSON.stringify({ perTopic, verdict }, null, 1));
