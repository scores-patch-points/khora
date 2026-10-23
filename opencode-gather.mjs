// opencode-gather.mjs — a search ask answered from the pages read, with NO model.
//
// The Holodeck's own pipeline (vendor/holodeck, vendored by scripts/vendor-holodeck.mjs), not a second one:
//   research()    search the lanes the router picks, gate each candidate by a relevance null against ordinary English, read a
//                 few at a time, stop when another page is no longer expected to bring a name nobody said (Good-Turing),
//                 record every decision and every typed gap.
//   readSource()  each page into statements with names, figures, frames and character spans (the shape the Holodeck page hands its summary).
//   select()      per page, the claims that make a DIFFERENCE TO THE ASKER'S STANCE (the identity that asked, holding what its
//                 own words name), cut where one more line stops changing what the page concludes (windowOf, the dmd window),
//                 each a verbatim span with its address. The house law: the world folded at a point, bounded by differences
//                 that make a difference.
// "Ordinary English" is Zenodotus's UD English prior (cli/priors/pos-prior-en.json, derived-priors/pos-priors, pinned).
// IO is injected and is where the serial / cached / rate-limit-aware layer lives. Pure of the door: it never touches the door's
// event loop, so run it in a worker (opencode-gather-worker.mjs); loading the reader alone is seconds of synchronous work.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { decide as decideGate, decideAll, gateFromEnv } from "./opencode-gather-gate.mjs";
import { correct as correctTypos } from "./opencode-gather-typos.mjs";
import { defineVoids } from "./opencode-gather-voids.mjs";
import { sameSense } from "./opencode-gather-identity.mjs";
import { pickByOverlap, sensesOf, anchorQueries, anchorPage, sensePrompt, parseSense } from "./opencode-gather-senses.mjs";
import { CLASSES, cleanName, itemsOf, reasonFields, ingestEot, projectRanked, taskOf, validatePlan, recordPlan } from "./opencode-gather-reason.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const V = (f) => new URL(`./vendor/holodeck/${f}`, import.meta.url).href;

// ── ordinary English: Zenodotus's UD English prior, counted by form ─────────────────────────────────────────
let _bg;
export const ordinaryEnglish = async (file = process.env.FOLD_GATHER_BACKGROUND ?? path.join(HERE, "cli/priors/pos-prior-en.json")) => {
  if (_bg) return _bg;
  const { makeBackground } = await import(V("holodeck-research-null.js"));
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const entries = [];
  for (const [form, pos] of Object.entries(j.forms ?? {})) {
    if (!/^[\p{L}][\p{L}'’-]*$/u.test(form)) continue;
    const n = Object.values(pos).reduce((a, b) => a + (+b || 0), 0);
    if (n > 0) entries.push([form.toLowerCase(), n]);
  }
  _bg = makeBackground(entries);
  return _bg;
};

// ── the injected IO: serial, kept on disk, one retry; a rate limit is NOT retried (the router cools that lane) ─────────
const isRateLimit = (e) => /\b429\b|rate.?limit|too many|bot check/i.test(String(e?.message ?? e));
const isTransient = (e) => /\b5\d\d\b|timeout|timed out|abort|ECONN|fetch failed|no engine answered/i.test(String(e?.message ?? e));
/** Page readers hand text with HTML entities in it (&#8217; &amp; &mdash;); the reading and the person see the characters. */
export const decodeEntities = (t) => String(t ?? "")
  .replace(/&#(\d+);/g, (m, n) => { try { return String.fromCodePoint(Number(n)); } catch { return m; } })
  .replace(/&#x([0-9a-f]+);/gi, (m, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch { return m; } })
  .replace(/&(nbsp|amp|quot|apos|lt|gt|mdash|ndash|rsquo|lsquo|ldquo|rdquo|hellip);/gi, (m, n) => ({ nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…" })[n.toLowerCase()]);

const sleep = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

/** A promise that gives up: a lane that hangs (a site that never answers, three doors each waiting its turn) must not hold a whole batch past the deadline. */
const within = (p, ms, label) => new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms); Promise.resolve(p).then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); }); });

export const withDisk = (lanes, { dir, ttlMs = 24 * 3600_000, now = Date.now, gapMs = 1500, retryMs = 3000, readMs = 12_000, searchMs = 20_000, calls = { search: 0, read: 0, cached: 0 }, texts = new Map() } = {}) => {
  const stop = { aborted: false }; // set by the gather when its time budget is reached: reads and searches then fail at once
  const file = (kind, key) => path.join(dir, `${kind}-${crypto.createHash("sha256").update(key).digest("hex").slice(0, 32)}.json`);
  const get = (f) => { try { const j = JSON.parse(fs.readFileSync(f, "utf8")); return now() - j.at <= ttlMs ? j.v : undefined; } catch { return undefined; } };
  const put = (f, v) => { try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, JSON.stringify({ at: now(), v })); } catch { /* the disk never blocks a search */ } };
  let chain = Promise.resolve(); // searches go one at a time, a gap apart
  let last = 0;
  const serial = (fn) => { const run = chain.then(async () => { await sleep(Math.max(0, last + gapMs - Date.now())); try { return await fn(); } finally { last = Date.now(); } }); chain = run.catch(() => {}); return run; };
  return {
    ...lanes,
    search: async (scope, q) => {
      const f = file("s", `${scope}|${q}`);
      const hit = get(f);
      if (hit?.results?.length) { calls.cached++; return hit; }
      return serial(async () => {
        let err;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (attempt) await sleep(retryMs);
          calls.search++;
          try {
            if (stop.aborted) throw new Error("stopped: the time budget was reached");
            const out = await within(lanes.search(scope, q), searchMs, "search");
            if (out?.results?.length) put(f, out);
            return out;
          } catch (e) { err = e; if (isRateLimit(e) || !isTransient(e)) throw e; }
        }
        throw err;
      });
    },
    read: async (url, cand) => {
      const f = file("p", url);
      const hit = get(f);
      if (hit?.ok && hit.text) { calls.cached++; const dec = { ...hit, text: decodeEntities(hit.text), title: decodeEntities(hit.title) }; texts.set(url, dec); return dec; }
      calls.read++;
      if (stop.aborted) return { ok: false, error: "stopped: the time budget was reached" };
      const raw = await within(lanes.read(url, cand), readMs, "read").catch((e) => ({ ok: false, error: String(e?.message ?? e) }));
      const out = raw?.ok ? { ...raw, text: decodeEntities(raw.text), title: decodeEntities(raw.title) } : raw;
      if (out?.ok && String(out.text ?? "").trim()) { put(f, out); texts.set(url, out); }
      return out;
    },
    texts, calls, stop,
  };
};

// ── the stance: what the asker already holds, so that what is new to them is what makes a difference ────────────────
export const stanceOf = (ask, namesIn) => ({
  conclusion: { names: namesIn(ask, null).map((n) => n.name).filter(Boolean).slice(0, 5), frames: ["fact"], measures: [], stance: 0, n: 0 },
});

/** The question inside the request: "find me the tallest mountains in South America" asks about the mountains, and the lanes (a full-text
 *  encyclopedia search above all) answer the words they are given, so the request's own frame is not sent. */
export const contentQuestion = (ask) => {
  const q = String(ask ?? "").replace(/\s+/g, " ").trim().replace(/^(?:(?:please|kindly)\s+)?(?:(?:can|could|would|will)\s+you\s+)?(?:(?:please|kindly)\s+)?(?:(?:help\s+me\s+)?(?:to\s+)?)?(?:find|search\s+for|search|look\s?up|look\s+for|locate|gather|research|discover|get)\s+(?:me\s+|us\s+)?(?:(?:some|any|the|a|an)\s+)?/i, "").replace(/[?.!\s]+$/, "");
  return q.length >= 3 ? q : String(ask ?? "").trim();
};

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return String(u); } };
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** gather({ ask, io, background, emit, readerFor }) -> { text, sources, passages, gaps, stop, calls, modelCalls: 0 } */
export async function gather({ ask, io, background, emit = () => {}, selectLines = 8, maxChars = 120_000, softMs = 45_000, plan: nominated = null, nominate = null, topic = null, kind = null, gate = gateFromEnv(), senses = (t) => sensesOf(t, { dir: process.env.FOLD_SENSE_CACHE ?? path.join(os.homedir(), ".local/share/foldcode/sense-cache") }), janus = undefined, eotRoot = true }) {
  const { research } = await import(V("holodeck-research.js"));
  const { readSource, namesIn, referentKey } = await import(V("holodeck-research-read.js"));
  const bg = background ?? (await ordinaryEnglish());
  // THE NOMINATOR (optional, off by default): a model may propose what to look at (the question, the measure, the order, extra queries).
  // A nomination is data: only validated keys survive, and the log stores it asserted. It cannot read, verify or rank.
  let modelCalls = 0;
  let raw = nominated;
  if (!raw && typeof nominate === "function") { try { modelCalls++; raw = await nominate(ask); } catch { raw = null; } }
  const { plan, dropped } = raw ? validatePlan(raw) : { plan: {}, dropped: [] };
  // The asked-for thing: a nominated question, else the topic the router read out of the ask (the request's frame removed in any language),
  // else the ask with a leading search frame stripped. The ask itself still names the stance below, and is what the answer is written for.
  const question = plan.question ?? (topic && clean(topic).length >= 2 ? clean(topic) : contentQuestion(ask));
  // An ACCOUNT of a world topic (an essay, an explanation) is not in a code host: for "dolphins" the GitHub lane brings dolphin-player and
  // DolphinScheduler. The lane is dropped from the router's choice, from what the web hits vote for, and from the widening.
  const drop = new Set(kind === "account" ? ["github"] : []);
  if (drop.size && io.route) {
    const route = io.route, probe = io.probe;
    io = { ...io, route: (q) => { const r = route(q); return { ...r, scopes: (r.scopes ?? []).filter((x) => !drop.has(x)), rest: (r.rest ?? []).filter((x) => !drop.has(x)) }; }, probe: (hits, chosen) => { const p = probe ? probe(hits, chosen) : { add: [], why: {} }; return { ...p, add: (p?.add ?? []).filter((x) => !drop.has(x)) }; } };
  }
  // WHAT THE WORD MEANS, before anything is read: a search answers the web's commonest use of a word ("jaguar" returns dealerships), and pages
  // that agree with each other cannot show they are the wrong sense. Wikipedia names the word's primary use, or says it has none.
  let sense = { kind: "none", senses: [] }, chosen = null, anchorRef = null;
  if (kind === "account" && typeof senses === "function") {
    try { sense = await senses(question); } catch { sense = { kind: "none", senses: [], failed: true }; }
    if (sense.kind === "primary") chosen = { title: sense.title, description: sense.description, by: "wikipedia" };
    if (sense.kind === "disambiguation" && sense.senses.length >= 2) {
      const list = [...sense.senses].sort((x, y) => Number(new RegExp(`\\b${question.split(" ")[0]}`, "i").test(y.title)) - Number(new RegExp(`\\b${question.split(" ")[0]}`, "i").test(x.title))).slice(0, 8);
      let idx = pickByOverlap(ask, question, list), by = "ask";
      if (idx == null && typeof gate === "function") { try { modelCalls++; idx = parseSense(await gate(sensePrompt(ask, list)), list.length); by = "model"; } catch { idx = null; } }
      if (idx != null) chosen = { ...list[idx], by };
      sense = { ...sense, offered: list.map((x) => x.title) };
    }
    // the chosen sense's own Wikipedia article is the reference for its vocabulary; read now, before the time budget can stop reads
    if (chosen?.title && io.read) {
      const r = await Promise.race([io.read(`https://en.wikipedia.org/wiki/${encodeURIComponent(chosen.title.replace(/ /g, "_"))}`, { url: "", title: chosen.title }), new Promise((res) => setTimeout(() => res(null), 8000))]).catch(() => null);
      anchorRef = r?.ok ? String(r.text ?? "").slice(0, maxChars) : null;
    }
    if (chosen) { const extra = anchorQueries({ kind: "primary", ...chosen }); if (extra.length) { const base = io.queriesFor; io = { ...io, queriesFor: (q) => [...new Set([...(base ? base(q) : [q]), ...extra])] }; } }
  }
  if (plan.queries?.length) { const base = io.queriesFor; io = { ...io, queriesFor: (q) => [...new Set([...(base ? base(q) : [q]), ...plan.queries])] }; }
  // The Holodeck's stopping rule has no page cap: it reads while another page is still expected to bring a name nobody said, and a broad
  // question never saturates. An interactive turn cannot wait for that, so a soft deadline aborts the loop and the run returns what it
  // had read, said plainly ("stopped: time budget") so a partial reading is never passed off as a finished one.
  const ac = new AbortController();
  if (io.stop) ac.signal.addEventListener("abort", () => { io.stop.aborted = true; });
  const timer = setTimeout(() => ac.abort(), softMs);
  let run;
  try { run = await research(question, { ...io, background: bg, parse: readSource, emit, signal: ac.signal }); } finally { clearTimeout(timer); }
  // Nothing read, and a word of the question the English prior has never seen sits a letter from one it has: ask again with that word mended. Only
  // then: mended up front, "panthera" became "panera" and "dehydration" "hydration".
  let mended = null;
  if (!run.sources.length && !io.stop?.aborted) {
    const fix = correctTypos(question);
    if (fix.fixed.length) {
      const ac2 = new AbortController();
      if (io.stop) { io.stop.aborted = false; ac2.signal.addEventListener("abort", () => { io.stop.aborted = true; }); }
      const t2 = setTimeout(() => ac2.abort(), Math.max(8000, softMs / 2));
      try { const again = await research(fix.text, { ...io, background: bg, parse: readSource, emit, signal: ac2.signal }); if (again.sources.length) { run = again; mended = fix; } } finally { clearTimeout(t2); }
    }
  }
  if (run.stop?.reason === "aborted") run.stop = { ...run.stop, reason: `time budget (${Math.round(softMs / 1000)} s) reached before the sources saturated` };
  const kept = run.sources.map((s, i) => ({ n: i + 1, id: s.id, url: s.url, title: decodeEntities(s.title || s.url), chars: s.chars, sha256: s.sha256, rel: Number(s.textRel?.g) || 0, text: String(io.texts?.get(s.url)?.text ?? "").slice(0, maxChars) })).filter((s) => s.text.trim() && !/\(disambiguation\)/i.test(`${s.url} ${s.title}`));
  const out = { sources: kept.map(({ text, ...s }) => s), passages: kept.map((s) => ({ name: s.url, text: s.text.slice(0, 20_000) })), gaps: run.gaps, stop: run.stop, lanes: run.lanes, searches: run.searches, calls: { ...(io.calls ?? {}) }, modelCalls, plan: { accepted: plan, dropped } };
  if (!kept.length) {
    const why = run.gaps.slice(0, 8).map((g) => `- ${g.kind}${g.url ? ` ${g.url}` : g.q ? ` "${g.q}"` : ""}: ${clean(g.why).slice(0, 140)}`);
    return { ...out, text: ["Nothing was read, so nothing is stated.", ...(why.length ? ["", "Not read:", ...why] : []), "", "Search again later, or name a page to read."].join("\n") };
  }

  // The stance is the asker's: what their own words name is not news to them, so a statement that names, measures or frames something
  // new is a difference that makes a difference to them. The analysis is the Holodeck's own reading shape (statements with names,
  // figures, frames and spans), the one its page hands the summary.
  const S = await import(V("holodeck-summary.js"));
  const { termUnits, stemsOf } = await import(V("holodeck-research-null.js"));
  const stance = stanceOf(ask, namesIn);
  const held = stance.conclusion;
  const { units } = termUnits(question, { bg, entities: held.names });
  const bears = (t) => { const joined = ` ${stemsOf(t).join(" ")} `; return units.some((u) => joined.includes(` ${u.join(" ")} `)); };
  // a capitalised word that opens sentences ("It", "In", "This") or a numeral is not a name of anything; common words are read off the ordinary-English prior
  const commonWord = (w) => { try { return !!w && bg.p(stemsOf(String(w).toLowerCase())[0]) > 2e-4; } catch { return false; } };
  const nameNoise = (n) => { const t = clean(n).split(" "); return t.length === 1 && (t[0].length <= 2 || commonWord(t[0])); };
  const sts = [], byId = new Map(), stsByDoc = new Map();
  for (const s of kept) {
    const list = readSource(s.text).sts.map((st, i) => ({ ...st, id: `${s.id}:${i}`, doc: s.id, n: s.n }));
    list.forEach((st) => byId.set(st.id, st));
    sts.push(...list);
    stsByDoc.set(s.id, list);
  }
  const A = { docs: kept.map((s) => ({ id: s.id, title: s.title })), docById: new Map(kept.map((s) => [s.id, { id: s.id, title: s.title }])), sts, byId, stsByDoc };
  const differs = (st) => {
    const c = S.conclusionOf([st], A);
    return c.names.some((n) => !held.names.includes(n)) || c.measures.some((m) => !held.measures.includes(m)) || c.frames.some((f) => !held.frames.includes(f));
  };
  // per source: the claims that differ from what the asker holds and bear on the question, cut at the dmd window; a line a
  // page repeats from another is shown once
  // An ACCOUNT of a world topic (an essay, an explanation) is asked by someone who holds nothing about it yet: the world folded at the EMPTY point
  // (no stance), so the lines are the pages' own most summary-worthy prose; the novelty filter below (a name, a measure or a frame the asker did not
  // already hold) is for answers that are entities and figures, and it drops every explanatory sentence ("plants use sunlight, water and carbon
  // dioxide to make glucose" names and measures nothing). Page furniture is kept out by the shape of the line: prose has few capitalised words.
  const account = kind === "account";
  // page furniture that reads as a sentence: a licence notice, the terms of use, a cookie banner, a subscription prompt
  const BOILER = /\b(?:creative commons|share-?alike|terms of use|privacy policy|all rights reserved|cookies?|subscribe|newsletter|sign up|log in|copyright ©|©\s?\d{4}|additional terms may apply|by using this site|click here|read more|advertisement)\b/i;
  const proseLine = (l) => { const w = l.split(/\s+/); return !BOILER.test(l) && l.length >= 50 && l.length <= 320 && w.length >= 8 && /[.!?]$/.test(l) && w.filter((x) => /^\p{Lu}/u.test(x)).length / w.length <= 0.4 && !/https?:|@\w/.test(l); };
  // The topic's own vocabulary, read off the corpus and not off the question: the words rare in ordinary English that recur across independent sites.
  // A licence notice or a reader's comment is distinctive but off-topic (it shares none of it); an explanatory line carries several.
  let core = null;
  if (account) {
    const byHost = new Map();
    for (const s of kept) { const h = hostOf(s.url); const set = byHost.get(h) ?? byHost.set(h, new Set()).get(h); for (const w of new Set(stemsOf(s.text))) if (bg.p(w) < 2e-4) set.add(w); }
    const need = Math.max(2, Math.ceil(0.25 * byHost.size));
    const cnt = new Map();
    for (const set of byHost.values()) for (const w of set) cnt.set(w, (cnt.get(w) ?? 0) + 1);
    core = new Set([...cnt].filter(([, n]) => n >= need).map(([w]) => w));
  }
  const coreHits = (l) => new Set(stemsOf(l).filter((w) => core?.has(w))).size;
  // A page about another sense of the word (a football club's depth chart for "dolphins") shares almost none of the corpus's vocabulary.
  const offSense = new Set();
  let gateInfo = { asked: false, doubtful: [], by: "none" };
  if (core && kept.length >= 4) {
    // the share of a page's own rare vocabulary that the corpus shares: a page of another sense is mostly words nobody else uses
    const rareOf = (t) => new Set(stemsOf(t).filter((w) => bg.p(w) < 2e-4));
    const A = anchorRef ? rareOf(anchorRef) : null;
    // against the chosen sense's own article when it was read, else against the corpus's shared vocabulary (the share of a page's own rare words)
    const hits = kept.map((s) => { const rare = rareOf(s.text); return { s, share: rare.size ? [...rare].filter((w) => (A ?? core).has(w)).length / rare.size : 0 }; });
    // HOLOGRAPHIC IDENTITY first: a page stays when the thing it calls by the topic's word is the same being as the one in the sense's own
    // article (identity-induction: the universes folded on the two match, and each carries weight). A shared word only nominated it.
    let identity = null;
    if (anchorRef) {
      try { identity = sameSense({ reference: anchorRef, pages: kept.map((x) => ({ id: String(x.n), text: x.text })), topic: chosen?.title ?? question }); } catch { identity = null; }
      if (process.env.FOLD_GATHER_DEBUG && identity?.ok) console.error("identity", kept.map((x) => `${identity.verdicts.get(String(x.n))?.same ? "SAME" : "----"} ${x.title.slice(0, 30)}`).join(" | "));
    }
    const bound = identity?.ok ? kept.filter((x) => identity.verdicts.get(String(x.n))?.same) : [];
    const d = await decideGate({ question, kept, hits, gate: undefined, anchored: Boolean(A), sense: chosen ? `${chosen.title}, ${chosen.description ?? ""}`.trim() : null });
    gateInfo = d.gate;
    if (d.gate.asked) modelCalls++;
    // with enough pages joined to the sense, only they are read for it (the ones not joined are not shown to be the same being); too few
    // joined, and the vocabulary gate decides as before
    if (bound.length >= 3) { const keep = new Set(bound.map((x) => x.n)); for (const x of kept) if (!keep.has(x.n)) offSense.add(x.n); gateInfo = { ...gateInfo, by: "identity", bound: bound.length, of: kept.length }; }
    else for (const n of d.drop) offSense.add(n);
    // the card gate: with a model configured it judges every page (chunked), the mechanical drop above is only its fallback
    if (typeof gate === "function") {
      const m = await decideAll({ question, kept, gate, sense: chosen ? `${chosen.title}${chosen.description ? `, ${chosen.description}` : ""}` : null, fallback: new Set(offSense) });
      offSense.clear(); for (const n of m.drop) offSense.add(n);
      modelCalls += m.gate.calls; gateInfo = { ...m.gate, bound: gateInfo.bound, of: gateInfo.of };
    }
    gateInfo = { ...gateInfo, dropped: kept.filter((x) => offSense.has(x.n)).map((x) => x.url), kept: kept.filter((x) => !offSense.has(x.n)).map((x) => x.url) };
    // out of every later step: its figures, names and lines would otherwise be graded as the topic's
    for (let i = kept.length - 1; i >= 0; i--) if (offSense.has(kept[i].n)) { stsByDoc.delete(kept[i].id); kept.splice(i, 1); }
    for (let i = sts.length - 1; i >= 0; i--) if (offSense.has(sts[i].n)) sts.splice(i, 1);
  }
  const said = new Set();
  const per = [];
  for (const s of [...kept].filter((x) => !offSense.has(x.n)).sort((a, b) => b.rel - a.rel)) {
    let lines = [];
    try {
      const claims = S.surprisePass(A, s.id).claims;
      const w = S.windowOf(claims, A);
      const size = Math.max(1, Math.min(selectLines, Number(w?.window) || 3));
      const picked = S.select(A, s.id, { size: account ? Math.max(size, 4) : size, forWhom: account ? null : stance });
      lines = picked.proves.map((p, i) => ({ p, line: clean(picked.lines[i]) })).filter(({ p, line }) => line && (account ? proseLine(/[.!?]$/.test(line) ? line : `${line}.`) && coreHits(line) >= 2 && (byId.get(p.id)?.dates?.length ?? 0) < 2 : bears(line) && differs(byId.get(p.id)))).map(({ line }) => line).filter((l) => !said.has(l.toLowerCase()) && said.add(l.toLowerCase()));
    } catch (e) { out.gaps.push({ kind: "select-failed", url: s.url, why: String(e?.message ?? e).slice(0, 120) }); }
    per.push({ s, lines });
  }

  // what recurs across sources (the paradigm): a name more than one page says, shown as the page wrote it, with how many say it
  const seen = new Map(), written = new Map();
  for (const s of kept) {
    const r = readSource(s.text);
    for (const st of r.sts) for (const n of st.names ?? []) if (!written.has(referentKey(n))) written.set(referentKey(n), n);
    // for an account, only a name said in a prose line that carries the topic's vocabulary counts: the names on a page's menu and footer do not
    const names = account ? new Set(r.sts.filter((st) => proseLine(/[.!?]$/.test(clean(st.text)) ? clean(st.text) : `${clean(st.text)}.`) && coreHits(st.text) >= 1).flatMap((st) => (st.names ?? []).filter((n) => !nameNoise(n)).map((n) => referentKey(n)))) : new Set((r.referents ?? []).filter(Boolean));
    for (const name of names) { const e = seen.get(name) ?? { name, docs: new Set(), hosts: new Set() }; e.docs.add(s.n); e.hosts.add(hostOf(s.url)); seen.set(name, e); }
  }
  const asked = new Set(held.names.map((n) => referentKey(n)));
  // independent pages only: a name that recurs across the pages of ONE site is that site's furniture (a navigation menu on 19 pages), not corroboration
  const recurs = [...seen.values()].filter((e) => e.hosts.size >= 2 && !asked.has(e.name)).map((e) => ({ ...e, key: e.name, name: written.get(e.name) ?? e.name })).sort((a, b) => b.docs.size - a.docs.size || a.name.localeCompare(b.name)).slice(0, 14);

  // what the sources STATE about each name: statements that bear on the question and give it a figure. A figure belongs to one name:
  // the statement's subject (its sentence-initial name), else the name that stands right before the figure (the link and field registers).
  const ownerOf = (st, fig) => {
    const names = st.nameSpans ?? [];
    const subject = names.find((n) => n.s <= 3);
    const near = names.filter((n) => fig.s - n.e >= 0 && fig.s - n.e <= 14).sort((x, y) => y.e - x.e)[0];
    if (subject) return subject.name;
    return near?.name ?? null;
  };
  const byName = new Map();
  for (const st of sts) {
    if (!(st.figs?.length) || st.text.length > 300 || !bears(st.text)) continue;
    const owners = new Set(st.figs.map((f) => ownerOf(st, f)).filter(Boolean));
    for (const name of owners) {
      const k = referentKey(name);
      if (asked.has(k)) continue;
      const e = byName.get(k) ?? { name: written.get(k) ?? name, docs: new Set(), lines: new Map() };
      e.docs.add(st.n);
      const fk = st.figs.map((f) => f.raw).join("|");
      (e.lines.get(fk) ?? e.lines.set(fk, { line: clean(st.text), docs: new Set() }).get(fk)).docs.add(st.n);
      byName.set(k, e);
    }
  }
  const figureLines = [...byName.values()].filter((e) => e.docs.size >= 1).sort((a, b) => b.docs.size - a.docs.size || a.name.localeCompare(b.name)).slice(0, 12)
    .map((e) => ({ name: e.name, count: e.docs.size, pick: [...e.lines.values()].sort((x, y) => y.docs.size - x.docs.size).slice(0, 2).map((g) => ({ line: g.line, cite: [...g.docs].slice(0, 4) })) }));

  // A quoted line carries its provenance as a link on the line itself ([the line](page-url "page title")): the person can click it, and
  // no address or number is written into the sentence, because the Fold's rule is that a citation is attached to an answer
  // afterwards and never typed into it (measured here: the same lines with "[3]" markers were 0 of 27 supported, without them 14).
  const linkOf = (n) => kept.find((x) => x.n === n);
  const quote = (line, ns) => { const src = linkOf(ns[0]); const t = /[.!?]$/.test(clean(line)) ? clean(line) : `${clean(line)}.`; return src ? `[${t}](${src.url} "${clean(src.title).replace(/"/g, "'")}")` : t; };
  const stop = (t) => (/[.!?]$/.test(t) ? t : `${t}.`);
  const used = new Map(); // source n -> the verbatim statements shown from it
  const use = (n, line) => (used.get(n) ?? used.set(n, new Set()).get(n)).add(clean(line));
  const record = []; // the lines that are measurements of the research run, not quotations of a page
  const body = [];
  const say = (line) => { body.push(line); record.push(line); };
  if (mended) { say(`Read as ${mended.text}: ${mended.fixed.map(([a, b]) => `${a} → ${b}`).join(", ")}.`); body.push(""); }
  if (chosen) { say(`Read for the meaning ${chosen.title}${chosen.description ? ` (${chosen.description})` : ""}, chosen by ${chosen.by}${offSense.size ? `; other meanings set aside ×${offSense.size}` : ""}.`); body.push(""); }
  else if (sense.offered?.length) { say(`The word has several meanings and none was chosen: ${sense.offered.join("; ")}.`); body.push(""); }
  if (recurs.length) { say(`Named by several independent sites: ${recurs.map((e) => `${e.name} (${e.hosts.size} sites)`).join(", ")}.`); body.push(""); }
  // THE REASONING, over the EOT: the pages go into the task's log as witnessed events, Janus decides which pages agree about each name's
  // measured figure, its verdicts go into the log as `reason` events, and the ranking below is projected from the log, not from here.
  const taskId = `${taskOf(question)}-${Date.now().toString(36)}`;
  let ranked = [];
  let eot = null;
  try {
    const common = (w) => { try { return !!w && bg.p(stemsOf(w)[0]) > 2e-4; } catch { return false; } };
    // the asker's own names are never measured owners ("South America" is not a thing to rank), whole or with a word stripped
    const askedLike = (key) => [...asked].some((a) => a === key || a.endsWith(` ${key}`) || key.endsWith(` ${a}`));
    const recurKeys = new Set(recurs.map((e) => e.key));
    const items = itemsOf(sts, {
      keyOf: referentKey,
      nameOf: (n) => (askedLike(referentKey(n)) ? null : (askedLike(referentKey(cleanName(n, common))) ? null : cleanName(n, common))),
      // a figure line counts when it bears on the question, or when its owner is a name several pages share (a table row holds no question word)
      admit: (st, key) => bears(st.text) || recurKeys.has(key),
    });
    const rf = await reasonFields(items, { measure: plan.measure, order: plan.order ?? "desc", ...(janus ? { janus } : {}) });
    if (rf.fields.length && eotRoot) {
      if (raw) recordPlan({ task: taskId, plan, dropped });
      eot = { task: taskId, ...ingestEot({ task: taskId, kept, fields: rf.fields, now: Date.now(), universe: "gather" }) };
      ranked = projectRanked(taskId, { order: plan.order ?? "desc" });
    }
  } catch (e) { out.gaps.push({ kind: "reason-failed", why: String(e?.message ?? e).slice(0, 120) }); }
  out.eot = eot;
  out.ranked = ranked.map((f) => ({ name: f.name, cls: f.cls, ref: { raw: f.ref.raw, unit: f.ref.unit, base: f.ref.base, n: f.ref.n }, agree: f.agree.map((a) => a.n), dispute: f.dispute.map((a) => ({ n: a.n, raw: a.raw, unit: a.unit })) }));
  const BASE = (cls) => CLASSES[cls]?.base ?? "";
  const fmt = (v) => Number(v).toLocaleString("en-US", { maximumFractionDigits: v < 100 ? 2 : 0 });
  const stated = (r, cls) => (CLASSES[cls]?.units[r.unit] === 1 ? r.raw : `${r.raw} (${fmt(r.base)} ${BASE(cls)})`);
  const pages = (k) => `${k} page${k === 1 ? "" : "s"}`;
  if (ranked.length) {
    const rows = ranked.map((f) => ({ f, agree: new Set([f.ref.n, ...f.agree.map((a) => a.n)]) }));
    const sections = [
      ["Ranked by the figure the pages give, highest first; each agreement was checked by an equation within the precision the page states.", rows.filter((r) => r.agree.size >= 2)],
      ["Given by one page only.", rows.filter((r) => r.agree.size < 2)],
    ];
    for (const [title, list] of sections) {
      if (!list.length) continue;
      say(title);
      body.push("");
      for (const { f, agree } of list) {
        const dis = f.dispute;
        // "agree ×14" and not "14 pages agree": a count written as number + noun is read by the grounding judge as a claim about how many
        // times a thing is mentioned, which a measurement of the run is not
        say(`${f.name}: ${stated(f.ref, f.cls)} (${agree.size === 1 ? "given by one page" : `agree ×${agree.size}`}${dis.length ? `; dispute ×${new Set(dis.map((d) => d.n)).size}: ${[...new Set(dis.map((d) => stated(d, f.cls)))].slice(0, 3).join("; ")}` : ""}).`);
        body.push("");
        if (f.ref.line) { use(f.ref.n, f.ref.line); body.push(`- ${quote(f.ref.line, [f.ref.n])}`); }
        for (const d of dis.slice(0, 1)) if (d.line) { use(d.n, d.line); body.push(`- ${quote(d.line, [d.n])}`); }
        body.push("");
      }
    }
  } else if (figureLines.length) {
    say("What the sources give a figure for, by name.");
    body.push("");
    for (const f of figureLines) {
      say(`${f.name} (${f.count} pages).`);
      body.push("");
      for (const p of f.pick) { p.cite.forEach((n) => use(n, p.line)); body.push(`- ${quote(p.line, p.cite)}`); }
      body.push("");
    }
  }
  const shown = per.filter((x) => x.lines.length).slice(0, 8);
  if (shown.length) {
    say("By source, the most relevant first.");
    body.push("");
    for (const { s, lines } of shown) for (const l of lines.slice(0, 3)) { use(s.n, l); body.push(`- ${quote(l, [s.n])}`); }
    body.push("");
  }
  const byKind = new Map();
  for (const g of out.gaps) byKind.set(g.kind, (byKind.get(g.kind) ?? 0) + 1);
  const notRead = [...byKind.entries()].map(([k, n]) => `${n} ${k}`).join(", ");
  const head = `Read ${kept.length} source(s) for "${clean(question)}"${run.stop?.reason ? ` (stopped: ${run.stop.reason})` : ""}. Lines are quoted from the pages, chosen for what they add to what you named and cut where one more line stops changing what a page concludes.`;
  record.unshift(head);
  const tail = notRead ? [`Not read or turned away: ${notRead}.`] : [];
  tail.forEach((l) => record.push(l));
  const text = [head, "", ...body, ...tail].join("\n").trim();

  // What the grounding check weighs the answer against: the statements shown, each with its neighbours for context (the bounded
  // holograph, not whole pages: its passage budget is small, and 35 pages of 20,000 characters left room for only the last three), each
  // closed with its own full stop so a heading never runs into the sentence after it; plus the research record the header and the
  // recurrence lines measure.
  const passages = [];
  for (const s of kept) {
    const lines = used.get(s.n);
    if (!lines) continue;
    const list = stsByDoc.get(s.id) ?? [];
    const keep = new Set();
    list.forEach((st, i) => { if ([...lines].some((l) => clean(st.text) === l || clean(st.text).includes(l))) for (const j of [i - 1, i, i + 1]) if (list[j]) keep.add(j); });
    const t = [...keep].sort((x, y) => x - y).map((j) => stop(clean(list[j].text))).join("\n").slice(0, 5000);
    if (t) passages.push({ name: s.url, text: t });
  }
  passages.push({ name: "research record (assembled by the door)", text: record.join("\n") });
  // `notes`: the lines of the answer that are measurements of the run, not quotations of a page. They are the person's to read; the grounding check
  // is not asked to grade them (the judge has no convention for a note: marked up as quote, italic, bold or code it still reads them as claims).
  // `quotes`: every line shown, flat, in the order shown (an essay is written from these, a section at a time); `parts`: the names the pages share
  const quotes = [...used.values()].flatMap((set) => [...set]);
  // THE VOID to fill: what the read pages say several things about, defined from the corpus before anything is written
  const voids = account ? defineVoids(passages.filter((p) => /^https?:/.test(p.name)).flatMap((p) => { let host = ""; try { host = new URL(p.name).hostname.replace(/^www\./, ""); } catch { /* a non-url name */ } return p.text.split(/\n+/).map((t) => t.trim()).filter((t) => t.length >= 50 && t.length <= 320 && proseLine(/[.!?]$/.test(t) ? t : `${t}.`)).map((text) => ({ text, host })); }), { topic: question }) : [];
  return { ...out, voids, modelCalls, gate: gateInfo, sense: { kind: sense.kind, title: chosen?.title ?? sense.title ?? null, by: chosen?.by ?? null, offered: sense.offered ?? null }, passages, text, notes: record, quotes, parts: recurs.slice(0, 6).map((e) => e.name), recurs: recurs.map((e) => ({ name: e.name, sources: [...e.docs] })) };
}

/** The door's way in: lanes (heimdall first, then the lanes the router holds), kept on disk, serial. */
export async function gatherFor(ask, { softMs, plan, topic, kind, heimdall = process.env.FOLD_HEIMDALL_URL ?? process.env.HEIMDALL_URL ?? "http://127.0.0.1:8790", dir = process.env.FOLD_GATHER_CACHE ?? path.join(os.homedir(), ".local/share/foldcode/gather-cache"), fetchImpl, emit, gapMs, retryMs } = {}) {
  const { makeLanes } = await import(V("holodeck-research-lanes.js"));
  const lanes = makeLanes({ bridge: heimdall, ...(fetchImpl ? { fetchImpl } : {}) });
  const calls = { search: 0, read: 0, cached: 0 };
  const io = withDisk(lanes, { dir, calls, gapMs, retryMs });
  return gather({ ask, io, emit, ...(softMs ? { softMs } : {}), ...(plan ? { plan } : {}), ...(topic ? { topic } : {}), ...(kind ? { kind } : {}) });
}

// ── the answer, in the wire format of an OpenAI-compatible chat model ───────────────────────────────────────────
// A gather turn is pointed at the door (the plugin's model.request hook sets the base URL), and the door answers with the text it
// assembled: the harness gets a normal assistant message, and no model is called. Zero tokens are reported, because none were spent.
export const chatCompletion = ({ text, model = "fold-gather", stream = false, id = `gather-${Date.now().toString(36)}`, now = () => Math.floor(Date.now() / 1000) }) => {
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  if (!stream) return { type: "application/json", body: JSON.stringify({ id, object: "chat.completion", created: now(), model, choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }], usage }) };
  const chunk = (delta, finish = null, extra = {}) => `data: ${JSON.stringify({ id, object: "chat.completion.chunk", created: now(), model, choices: [{ index: 0, delta, finish_reason: finish }], ...extra })}\n\n`;
  const pieces = text.match(/[\s\S]{1,400}/g) ?? [""];
  return { type: "text/event-stream", body: [chunk({ role: "assistant", content: "" }), ...pieces.map((c) => chunk({ content: c })), chunk({}, "stop"), `data: ${JSON.stringify({ id, object: "chat.completion.chunk", created: now(), model, choices: [], usage })}\n\n`, "data: [DONE]\n\n"].join("") };
};
