#!/usr/bin/env node
// hunt-stance.mjs — go and FIND the missing pole, cheaply.
//
//   node native/scripts/hunt-stance.mjs --out DIR --topic "Sunshine Protection Act" [--asked oppose]
//                                        [--max-searches 3] [--max-fetches 6] [--dry]
//
// PRIOR ART, reused and not re-derived:
//   organs/ranke.js        the hunt is GATED structurally (a page that cites nothing licenses no chase; here: a spectrum whose poles
//                          already hold named holders licenses NO search), BUDGETED (maxSearches/maxFetches, declared by the caller:
//                          P9) and never unbidden (this script is the toggle).
//   organs/kairos.js       the stop rule is the difference that makes a difference: a round that adds no stance on the topic ends
//                          the hunt, and a pole that has filled ends it.
//   scripts/follow-index.mjs / callimachus-run.mjs   fetch, pin (Pinax), cache by url, typed absences; nothing invented.
//
// ENERGY (every step is the cheaper test before the dearer one; the model is never called):
//   0. zero network when the plan says nothing is needed;
//   1. search once per probe, asked pole first, at most --max-searches probes;
//   2. a result is fetched only if its TITLE or SNIPPET already mentions the topic (a string test, no fetch);
//   3. a fetched page is parsed only on the sentences that mention the topic (a string test first, then one parse of those);
//   4. only a page that states at least one stance toward the topic is PINNED; others are typed absences (`off_topic`);
//   5. a cached url is never fetched twice (DIR/hunt/<sha12>.{raw,txt}); the stop rule fires as soon as the needed pole has a named holder.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax } from "../organs/pinax.js";
import { readCorpus, extractText, declaredOf } from "../organs/callimachus.js";
import { readPerspectives, stancesOf, STANCE_FRAMES } from "../organs/perspectives.js";
import { huntPlan } from "../organs/stance-probes.js";
import { isIndexUrl } from "../organs/index-source.js";
import { WEB_UA, WEB_FETCH_TIMEOUT_MS, BLOCKED_STATUSES, looksLikeChallenge, parseSearchResults } from "../organs/web.js";
import { loadModel } from "../adapters/text/english-parser.js";
import { splitSentences } from "../adapters/text/spans.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = resolve(opt("--out") ?? ""), topic = opt("--topic");
if (!opt("--out") || !topic) { console.error("--out DIR and --topic NAME are required"); process.exit(2); }
const asked = opt("--asked", "oppose"), maxSearches = Number(opt("--max-searches", 3)), maxFetches = Number(opt("--max-fetches", 6)), dry = args.includes("--dry");
const enc = new TextEncoder(), dec = new TextDecoder();

const rec = JSON.parse(readFileSync(join(out, "record.json"), "utf8"));
const EXTRACTOR = { name: "web.js#extractReadable", sha256: createHash("sha256").update(readFileSync(join(here, "../organs/web.js"))).digest("hex") };
const model = loadModel(JSON.parse(readFileSync(join(here, "../priors/parser-eng-ewt.json"), "utf8")), { morphology: JSON.parse(readFileSync(join(here, "../priors/morphology-eng.json"), "utf8")) });

// 0. the spectrum as the record stands, and the gate
const recs = [], texts = new Map();
for (const s of rec.sources) {
  const raw = readFileSync(join(out, "layers", `${s.id}.raw`)), text = readFileSync(join(out, "layers", `${s.id}.txt`), "utf8");
  const p = await makePinax({ url: s.url, finalUrl: s.final_url, retrievedAt: s.retrieved_at, fetch: s.fetch, raw: new Uint8Array(raw), text, extractor: EXTRACTOR });
  p.declared = s.declared; recs.push(p); texts.set(p.entry.id, text);
}
const record = readCorpus(recs, { question: rec.question });
const names = [topic.toLowerCase()];
const spec = readPerspectives(record, { model, question: { focus: [], reading: { relation: { lemma: asked } } }, texts, topicSurfaces: names, frames: STANCE_FRAMES });
const plan = huntPlan(spec, { topic });
console.error(`spectrum: ${spec.positions.length} positions; sides + ${spec.sides["+"].length} / - ${spec.sides["-"].length}; plan: ${plan.why}`);
if (!plan.probes.length) { console.log(JSON.stringify({ hunted: false, why: plan.why, searches: 0, fetches: 0 })); process.exit(0); }
if (dry) { console.log(JSON.stringify({ hunted: false, dry: true, need: plan.need, probes: plan.probes.slice(0, maxSearches).map((p) => p.q) })); process.exit(0); }

// 1-5. the hunt
mkdirSync(join(out, "hunt"), { recursive: true });
const have = new Set(rec.sources.flatMap((s) => [s.url, s.final_url]).filter(Boolean));
const get = async (url) => {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), WEB_FETCH_TIMEOUT_MS);
  try { const r = await fetch(url, { headers: { "user-agent": `${WEB_UA} callimachus-hunt-stance`, accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: ctl.signal });
    return { ok: r.ok, status: r.status, ct: r.headers.get("content-type") ?? "", raw: new Uint8Array(await r.arrayBuffer()), final: r.url }; }
  catch (e) { return { ok: false, status: 0, err: String(e.message ?? e) }; } finally { clearTimeout(t); }
};
const topicWords = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
const mentions = (t) => spec.topicNames.some((n) => t.toLowerCase().includes(n)) || (topicWords.length > 0 && topicWords.every((w) => t.toLowerCase().includes(w)));
const needPole = plan.need[0];
const named = (rows) => rows.filter((r) => r.pole === needPole && r.holder && !r.pronoun);
let searches = 0, fetches = 0, found = [], absences = [], pinned = 0, stopped = "budget";
const now = new Date().toISOString();
outer:
for (const probe of plan.probes) {
  if (searches >= maxSearches) break;
  searches++;
  const r = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(probe.q)}`);
  const parsed = r.ok ? parseSearchResults(dec.decode(r.raw)) : { blocked: true, results: [] };
  if (parsed.blocked || !parsed.results.length) { absences.push({ type: parsed.blocked ? "bot_blocked" : "searched_absent", query: probe.q, corpus: "duckduckgo html", detail: `status ${r.status}` }); continue; }
  let roundGain = 0;
  for (const res of parsed.results.slice(0, 5)) {
    if (fetches >= maxFetches) { stopped = "budget"; break outer; }
    if (have.has(res.url) || isIndexUrl(res.url)) continue;
    if (!mentions(`${res.title ?? ""} ${res.snippet ?? ""}`)) continue; // 2: the cheap test before the fetch
    const id = createHash("sha256").update(res.url).digest("hex").slice(0, 12);
    const cache = { raw: join(out, "hunt", `${id}.raw`), txt: join(out, "hunt", `${id}.txt`) };
    let raw, text, status = 200, ct = "text/html", final = res.url, html = null;
    if (existsSync(cache.raw) && existsSync(cache.txt)) { raw = new Uint8Array(readFileSync(cache.raw)); text = readFileSync(cache.txt, "utf8"); }
    else {
      fetches++;
      const g = await get(res.url); status = g.status; ct = g.ct; final = g.final ?? res.url;
      if (!g.ok) { absences.push({ type: g.status === 0 ? "unreachable" : BLOCKED_STATUSES.includes(g.status) ? "bot_blocked" : `http_${g.status}`, url: res.url, detail: `hunt probe: ${probe.q}` }); continue; }
      if (!/html|xml|text/i.test(g.ct)) { absences.push({ type: "unadmitted", url: res.url, detail: g.ct }); continue; }
      html = dec.decode(g.raw); text = extractText(html); raw = g.raw;
      if (looksLikeChallenge({ title: html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "", textChars: text.length }) || text.length < 400) { absences.push({ type: "bot_blocked", url: res.url, detail: "challenge or shell page" }); continue; }
      writeFileSync(cache.raw, raw); writeFileSync(cache.txt, text);
    }
    // 3: parse only the sentences that mention the topic
    const rows = [];
    for (const sn of splitSentences(text)) {
      const t = sn.text.trim();
      if (t.length < 20 || t.length > 500 || !mentions(t)) continue;
      let rs; try { rs = stancesOf(t, "x", { model, focusSurfaces: spec.topicNames }); } catch { continue; }
      for (const s of rs) {
        if (s.refusal || !s.holder?.text) continue;
        const { pole } = spec.poleOf(s.pred, s.negated);
        if (pole !== "?") rows.push({ pole, holder: s.holder.text, pred: s.pred, negated: s.negated, pronoun: s.holder.pronoun, sentence: t.slice(0, 200) });
      }
    }
    if (!rows.length) { absences.push({ type: "off_topic", url: res.url, detail: "no stance toward the topic on a resolved pole" }); continue; } // 4
    roundGain += rows.length;
    found.push(...rows.map((x) => ({ ...x, url: res.url, probe: probe.q })));
    // pin (4): only a page that stated a stance
    const html2 = html ?? dec.decode(raw);
    const p = await makePinax({ url: res.url, finalUrl: final, retrievedAt: now, fetch: { status, content_type: ct, via: "node fetch", seed: `hunt:${probe.q}` }, raw, text, extractor: EXTRACTOR });
    if (!rec.sources.some((s) => s.id === p.entry.id)) {
      writeFileSync(join(out, "layers", `${p.entry.id}.raw`), p.layers.raw); writeFileSync(join(out, "layers", `${p.entry.id}.txt`), p.layers.text);
      rec.sources.push({ ...p.entry, declared: declaredOf(html2), role: "source" });
      rec.collection.seeds.push({ url: res.url, seed: `hunt:${probe.q}` });
      have.add(res.url); pinned++;
    }
    if (named(found).length) { stopped = "pole_filled"; break outer; } // kairos: the difference was made
  }
  if (roundGain === 0) { stopped = "no_difference"; break; } // kairos: a round that adds nothing ends the hunt
}
rec.absences = [...(rec.absences ?? []), ...absences];
rec.collection.stance_hunt = { at: now, topic, asked, need: plan.need, searches, fetches, pinned, stopped, budget: { maxSearches, maxFetches }, rule: "ranke.js gate+budget; kairos.js stop; ENERGY: header" };
writeFileSync(join(out, "record.json"), JSON.stringify(rec, null, 1));
console.log(JSON.stringify({ hunted: true, need: plan.need, searches, fetches, pinned, stopped, found: found.map((f) => ({ pole: f.pole, holder: f.holder, pred: f.pred, url: f.url })), absences: absences.map((a) => a.type) }));
