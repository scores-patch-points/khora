// eval/meaning/stage-run.mjs — the STAGE arm (PREREG run 23): claim and source each read by read-atoms.js into a Stage@1 record (stage.js), the
// claim's ends bound to the source's anchors (stage-bind.js), the verdict HL's read(stage, formula) (stage-verdict.js). Nothing else decides.
// Each pair is read once; every binding mode is then judged on the same stages, so modes differ only in their binding or licenses.
//   node eval/meaning/stage-run.mjs [--sets main,cf,…] [--modes none,folded] [--out result.json] [--stages stages.jsonl] [--pairs pairs.jsonl]
// Sets: the nine spent sets by default (The Fold's C3 main and counterfactual from FOLD_C3_DIR, and this folder's), or any name=file.json.
// Environment as run.mjs: FOLD_WIKT_SLIM (the slim Wiktionary), FOLD_WIKT_TRANSLATIONS, KHORA_PRIORS_DIR (the priors the reader reads).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), N = path.join(HERE, "../../native");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const { readStage, stageHash, serializeStage, candidateEquivalences } = await import(`${N}/organs/stage.js`);
const BIND = await import(`${N}/organs/stage-bind.js`);
const { stageVerdict, swapReads } = await import(`${N}/organs/stage-verdict.js`);
const { readAtoms } = await import(`${N}/organs/read-atoms.js`);
const GE = await import(`${N}/adapters/text/grammar-en.js`), { loadGrammar } = await import(`${N}/adapters/text/grammar-ud.js`), { PACKS } = await import(`${N}/adapters/text/grammar-packs.js`);
const { openSlim } = await import(`${N}/organs/wikt-slim.js`), { makeGlossary, makeSynonymy, loadTranslations } = await import(`${N}/organs/wikt-gloss.js`);
const { priorsHome } = await import(`${N}/the-fold/prior-source.mjs`);
// janus's identity organs, read where khora reads janus (priors-home.js JANUS_DIR, the sibling checkout), or from MEANING_JANUS_DIR: imported,
// never copied (janus native/organs/identity/resolve.mjs, correspond.mjs)
const { JANUS_DIR } = await import(`${N}/the-fold/priors-home.js`);
const JD = process.env.MEANING_JANUS_DIR ?? JANUS_DIR;
const JANUS = await (async () => { try { return { resolve: await import(path.join(JD, "native/organs/identity/resolve.mjs")), correspond: await import(path.join(JD, "native/organs/identity/correspond.mjs")) }; } catch { return null; } })();

// ---- the reader, as the atoms arm reads (run.mjs): English by grammar-en, the rest by grammar-ud, glossed from the slim Wiktionary --------
const SLIM = openSlim(process.env.FOLD_WIKT_SLIM ?? `${process.env.HOME}/.cache/live_priors/wiktionary/wiktionary-slim-2026-10-01-v2.pack`);
const T = loadTranslations(process.env.FOLD_WIKT_TRANSLATIONS ?? path.join(HERE, "../../../data/wiktionary-translations"));
const lookup = (l, w) => SLIM.entries(l, w), gl = makeGlossary(lookup, { translations: T }), syn = makeSynonymy({ lookup, translations: T });
const UDG = {}; for (const lang of ["es", "fr", "de", "ja"]) { const g = await loadGrammar(lang, { glossary: makeGlossary(lookup) }); if (g) UDG[lang] = g; }
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms", "coref-ranker.json"), "utf8"));
const grammarOf = (lang) => (lang === "en" ? { rowsOf: GE.rowsOf, claimsOf: (t, rows) => GE.claimsOf(t, rows) } : UDG[lang] ?? null);
const grammarName = (lang) => (lang === "en" ? `grammar-en/${GE.READER}` : UDG[lang] ? `grammar-ud/${lang}` : null);
export const keysOf = (lang, w) => [...new Set([...(gl.all?.(lang, w, "NOUN") ?? []), ...(gl.all?.(lang, w, "VERB") ?? []), ...(gl.all?.(lang, w, "ADJ") ?? [])])];
export const same = (lang, a, b) => ["NOUN", "VERB", "ADJ"].some((u) => syn(lang, a, b, u).same);
// the priors the reader read, as one hash: every file of the priors home, by name and content
const PRIORS = (() => { const dir = priorsHome().dir; if (!dir || !fs.existsSync(dir)) return null; const h = crypto.createHash("sha256");
  for (const f of fs.readdirSync(dir).sort()) { const p = path.join(dir, f); if (!fs.statSync(p).isFile()) continue; h.update(f + "\0"); h.update(crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex") + "\n"); } return h.digest("hex"); })();

// a pair's page (title and the sentences before its source sentence), as run.mjs finds it
const PAGES = new Map(); for (const f of fs.readdirSync(HERE).filter((x) => x.endsWith(".sources.json"))) for (const pg of JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8")).pages ?? []) PAGES.set(pg.url, pg);
const sentencesOf = (pg) => (pg.lang === "ja" ? pg.text.replace(/\n+/g, "").split(/(?<=。)/) : pg.text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑÀÂÈÊÎÔÛÄÖÜ«"(])/)).map((x) => x.trim()).filter(Boolean);
const contextOf = (p) => { const pg = p.source?.url && PAGES.get(p.source.url); if (!pg) return null; const ss = sentencesOf(pg), head = p.sentence.slice(0, 30), i = ss.findIndex((x) => x.startsWith(head)); return { title: pg.title, previous: i > 0 ? ss.slice(0, i) : [] }; };
const sideLang = (lang, side) => { const [src, claim] = String(lang).split("-"); return side === "claim" ? (claim ?? src) : src; };

export function readSide(text, lang, ctx) {
  const g = grammarOf(lang), title = ctx?.title ?? null, previous = ctx?.previous ?? [];
  const r = g ? readAtoms({ text, lang, title, previous, grammar: g, pack: PACKS[lang] ?? null, same: (a, b) => syn(lang, a, b, "NOUN").same, lookup, corefModel, keysOf: lang === "en" ? null : (w, u) => gl.all?.(lang, w, u) ?? null }) : null;
  return { reading: r, stage: readStage(r, { text, lang, title, previous, grammar: grammarName(lang), priors: PRIORS }) };
}
export function readPair(p) {
  const ctx = contextOf(p), cl = sideLang(p.lang ?? "en", "claim"), sl = sideLang(p.lang ?? "en", "source");
  const C = readSide(p.claim, cl, ctx ? { title: ctx.title, previous: [] } : null), S = readSide(p.sentence, sl, ctx);
  return { pair: p, claimLang: cl, sourceLang: sl, claim: C.stage, source: S.stage, claimReading: C.reading, sourceReading: S.reading };
}

// ---- modes: a binding (and, from M3, licenses) per name ------------------------------------------------------------------------------------
const resolveBind = (R, { correspond = true, quantities = false } = {}) => BIND.makeResolveBind({ resolveReferent: JANUS.resolve.resolveReferent, correspond: correspond ? JANUS.correspond : null, keysOf, claimLang: R.claimLang, sourceLang: R.sourceLang, claimReading: R.claimReading, sourceReading: R.sourceReading, quantities: quantities ? BIND.bindQuantity : null });
// the licenses both stages declared (each with its giver), one per kind and relation
export const licensesOf = (R) => { const m = new Map(); for (const l of [...R.claim.licenses, ...R.source.licenses]) for (const rel of l.rels) { const k = `${l.kind}\u0000${rel}`; if (!m.has(k)) m.set(k, { kind: l.kind, rels: [rel], giver: l.giver, standing: l.standing }); } return [...m.values()].sort((a, b) => (a.rels[0] < b.rels[0] ? -1 : a.rels[0] > b.rels[0] ? 1 : 0)); };
const EQ_GIVER = "Wiktionary synonymy (the slim English Wiktionary through the reader's makeSynonymy): thesaurus-grade, admitted on marginal gains";
export const equivalencesOf = (R) => (R.eq ??= candidateEquivalences(R.claim, R.source, (a, b) => ["NOUN", "VERB", "ADJ"].some((u) => syn("en", a, b, u).same), { giver: EQ_GIVER }));
// one binding per pair and mode family, shared by the modes built on it (the deranged control moves exactly the binding the arm used)
const cached = (R, k, f) => (c, s) => ((R.cache ??= {})[k] ??= f(c, s));
export const MODES = {
  none: { bind: () => BIND.bindNone },
  folded: { bind: () => BIND.bindFolded },
  resolve: { bind: (R) => cached(R, "resolve", resolveBind(R)) },
  "resolve-deranged": { bind: (R) => (c, s) => BIND.derange(cached(R, "resolve", resolveBind(R))(c, s), s) },
  "resolve-only": { bind: (R) => cached(R, "resolve-only", resolveBind(R, { correspond: false })) },
  // M3: figures bound by value (RC3) and the functional licenses the reader declared, with their givers, on either stage (RC3, RC6)
  m3: { bind: (R) => cached(R, "m3", resolveBind(R, { quantities: true })), licenses: (R) => licensesOf(R) },
  "m3-deranged": { bind: (R) => (c, s) => BIND.derange(cached(R, "m3", resolveBind(R, { quantities: true }))(c, s), s), licenses: (R) => licensesOf(R) },
  "m3-unlicensed": { bind: (R) => cached(R, "m3", resolveBind(R, { quantities: true })), licenses: () => [] },
  // M4: the hedge layer (RC5) and coverage as gaps (RC7) on top of M3
  m4: { bind: (R) => cached(R, "m3", resolveBind(R, { quantities: true })), licenses: (R) => licensesOf(R), opts: { layered: true, gapRule: true } },
  "m4-deranged": { bind: (R) => (c, s) => BIND.derange(cached(R, "m3", resolveBind(R, { quantities: true }))(c, s), s), licenses: (R) => licensesOf(R), opts: { layered: true, gapRule: true } },
  "m4-unlicensed": { bind: (R) => cached(R, "m3", resolveBind(R, { quantities: true })), licenses: () => [], opts: { layered: true, gapRule: true } },
  // RC5's check: the same stage read on the asserted layer only (no layering)
  "m4-asserted-only": { bind: (R) => cached(R, "m3", resolveBind(R, { quantities: true })), licenses: (R) => licensesOf(R), opts: { layers: ["asserted"], gapRule: true } },
  // M5: R7, the equivalent license, its giver the reader's own Wiktionary synonymy
  m5: { bind: (R) => cached(R, "m3", resolveBind(R, { quantities: true })), licenses: (R) => [...licensesOf(R), ...equivalencesOf(R)], opts: { layered: true, gapRule: true } },
  "m5-deranged": { bind: (R) => (c, s) => BIND.derange(cached(R, "m3", resolveBind(R, { quantities: true }))(c, s), s), licenses: (R) => [...licensesOf(R), ...equivalencesOf(R)], opts: { layered: true, gapRule: true } },
  "m4-nogaps": { bind: (R) => cached(R, "m3", resolveBind(R, { quantities: true })), licenses: (R) => licensesOf(R), opts: { layered: true } },
};

// ---- scoring: accuracy E against not-E, false accepts, E accepted, C named, false-C, per set and pooled, and per language ---------------------
export function score(rows) {
  const n = rows.length, E = rows.filter((r) => r.label === "E"), notE = rows.filter((r) => r.label !== "E"), Cs = rows.filter((r) => r.label === "C"), nonC = rows.filter((r) => r.label !== "C");
  const ok = rows.filter((r) => (r.v === "E") === (r.label === "E")).length;
  return { n, acc: ok / n, ea: E.filter((r) => r.v === "E").length, nE: E.length, fa: notE.filter((r) => r.v === "E").length, nNotE: notE.length, cn: Cs.filter((r) => r.v === "C").length, nC: Cs.length, fc: nonC.filter((r) => r.v === "C").length, nNonC: nonC.length };
}
export const fmt = (s) => `acc ${(100 * s.acc).toFixed(1)}%  E ${s.ea}/${s.nE} (${(100 * s.ea / Math.max(1, s.nE)).toFixed(1)}%)  false-accept ${s.fa}/${s.nNotE} (${(100 * s.fa / Math.max(1, s.nNotE)).toFixed(1)}%)  C ${s.cn}/${s.nC}  false-C ${s.fc}/${s.nNonC} (${(100 * s.fc / Math.max(1, s.nNonC)).toFixed(1)}%)`;
export const langKey = (p) => (/^cross/.test(p.type ?? "") || String(p.lang ?? "en").includes("-") ? "cross" : p.lang ?? "en");

export function setsOf(names) {
  const C3 = process.env.FOLD_C3_DIR ?? path.join(HERE, "../../../the-fold/eval/ants/c3");
  const all = { main: path.join(C3, "battery.json"), cf: path.join(C3, "battery-cf.json"), heldout: path.join(HERE, "heldout.json"), other: path.join(HERE, "heldout-other.json"), fresh: path.join(HERE, "fresh.json"), relations: path.join(HERE, "relations.json"), "fresh-ml": path.join(HERE, "fresh-ml.json"), fresh19: path.join(HERE, "fresh19.json"), fresh20: path.join(HERE, "fresh20.json"), fresh23: path.join(HERE, "fresh23.json") };
  const out = {};
  for (const k of names) { const [n, f] = k.includes("=") ? k.split("=") : [k, all[k]]; if (!f || !fs.existsSync(f)) throw new Error(`no set ${k}`); out[n] = JSON.parse(fs.readFileSync(f, "utf8")).pairs; }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const sets = setsOf(arg("sets", "main,cf,heldout,other,fresh,relations,fresh-ml,fresh19,fresh20").split(","));
  const modes = arg("modes", "none,folded").split(",");
  const stagesOut = arg("stages", null), pairsOut = arg("pairs", null), out = arg("out", null);
  if (stagesOut) fs.writeFileSync(stagesOut, ""); if (pairsOut) fs.writeFileSync(pairsOut, "");
  const rows = Object.fromEntries(modes.map((m) => [m, []]));
  const V5MODE = arg("v5", null), ABLATE = arg("ablate", null), V5 = { pairs: 0, tried: {}, bound: [] }, ABL = { pairs: 0, runs: 0, moved: 0, unknown: 0, AWAY: 0, bugs: [] };
  if (modes.some((m) => /^resolve/.test(m)) && !JANUS) throw new Error(`janus's identity organs are not at ${JD} (set MEANING_JANUS_DIR)`);
  console.log(`stage arm · reader ${GE.READER} · priors ${PRIORS?.slice(0, 12) ?? "none"} · janus ${JANUS ? JD : "absent"} · modes ${modes.join(", ")}`);
  for (const [set, pairs] of Object.entries(sets)) {
    for (const p of pairs) {
      const R = readPair(p);
      if (stagesOut) fs.appendFileSync(stagesOut, JSON.stringify({ set, id: p.id, claim: stageHash(R.claim), source: stageHash(R.source) }) + "\n");
      for (const m of modes) {
        const M = MODES[m], rec = stageVerdict({ claim: R.claim, source: R.source, bind: M.bind(R), licenses: M.licenses?.(R) ?? [], sourceText: p.sentence, ...(M.opts ?? {}) });
        rows[m].push({ set, id: p.id, label: p.label, v: rec.label, hl: rec.verdict, lang: langKey(p) });
        // V5 (--v5 <mode>): constructed role and direction swaps of the arm's accepted pairs; ablation (--ablate <mode>): each license removed in turn
        let extra = {};
        if (m === V5MODE && rec.label === "E") { const sw = swapReads(rec, R.claim, R.source); V5.pairs++; for (const x of sw) { V5.tried[x.kind.replace(/-.*/, "")] = (V5.tried[x.kind.replace(/-.*/, "")] ?? 0) + 1; if (x.hl === "bound") { V5.bound.push({ set, id: p.id, ...x }); } } extra.swaps = sw.length; }
        if (m === ABLATE) { const full = M.licenses?.(R) ?? [], res = [];
          for (let i = 0; i < full.length; i++) { const less = full.filter((_, j) => j !== i), r2 = stageVerdict({ claim: R.claim, source: R.source, bind: M.bind(R), licenses: less, sourceText: p.sentence, ...(M.opts ?? {}) });
            ABL.runs++; if (r2.verdict !== rec.verdict) { ABL.moved++; const toward = (r2.verdict === "bound" && rec.verdict !== "bound") || (r2.verdict === "contradicted" && rec.verdict !== "contradicted") ? "AWAY" : "unknown"; ABL[toward]++; res.push({ removed: full[i].rels[0], from: rec.verdict, to: r2.verdict, toward }); if (toward === "AWAY") ABL.bugs.push({ set, id: p.id, removed: full[i].rels[0], from: rec.verdict, to: r2.verdict }); } }
          ABL.pairs++; extra.ablation = res; }
        if (pairsOut && /^m[45]$/.test(m)) { extra.claimGaps = rec.claimGaps; extra.reported = { claim: R.claim.arrangements.filter((x) => x.layer === "reported").length, source: R.source.arrangements.filter((x) => x.layer === "reported").length }; }
        if (pairsOut && m === "m5") extra.equivalences = R.eq?.map((l) => l.rels);
        if (pairsOut) fs.appendFileSync(pairsOut, JSON.stringify({ set, id: p.id, mode: m, label: p.label, v: rec.label, hl: rec.verdict, conjuncts: rec.conjuncts, gaps: rec.gaps.map((g) => g.kind), correspondence: R.cache?.resolve?.correspondence ?? null,
          // each claim figure and what the binding cell made of it: the source figure it meets, "distinct" (a value of its own), or unbound
          quantities: R.claim.anchors.filter((a) => a.kind === "quantity").map((a) => { const b = R.cache?.[m]?.map?.get(a.id) ?? null; return { label: a.label, measure: a.measure, bound: b == null ? null : b === a.id ? "distinct" : R.source.anchors.find((x) => x.id === b)?.label ?? b }; }),
          licenses: rec.licenses.map((l) => l.rels[0]), ...extra }) + "\n");
      }
    }
  }
  const result = {};
  for (const m of modes) {
    console.log(`\n== mode ${m}`);
    for (const set of Object.keys(sets)) console.log(`  ${set.padEnd(10)} ${fmt(score(rows[m].filter((r) => r.set === set)))}`);
    const pooled = score(rows[m]); console.log(`  ${"pooled".padEnd(10)} ${fmt(pooled)}`);
    const langs = [...new Set(rows[m].map((r) => r.lang))].sort();
    console.log(`  per language: ${langs.map((l) => { const s = score(rows[m].filter((r) => r.lang === l)); return `${l} ${(100 * s.acc).toFixed(1)}% (E ${s.ea}/${s.nE}, fa ${s.fa}, C ${s.cn}/${s.nC})`; }).join(" · ")}`);
    result[m] = { pooled, perSet: Object.fromEntries(Object.keys(sets).map((s) => [s, score(rows[m].filter((r) => r.set === s))])), rows: rows[m] };
  }
  if (V5MODE) console.log(`\nV5 (${V5MODE}): ${V5.pairs} accepted pairs; swaps tried ${JSON.stringify(V5.tried)}; read bound (false accepts): ${V5.bound.length}${V5.bound.length ? " " + JSON.stringify(V5.bound.slice(0, 10)) : ""}`);
  if (ABLATE) console.log(`\nlicense ablation (${ABLATE}): ${ABL.pairs} pairs, ${ABL.runs} single-license removals; verdict moved ${ABL.moved} (toward unknown ${ABL.unknown}, AWAY from unknown ${ABL.AWAY}); bugs ${JSON.stringify(ABL.bugs)}`);
  if (out) fs.writeFileSync(out, JSON.stringify({ ...result, v5: V5MODE ? V5 : undefined, ablation: ABLATE ? ABL : undefined }));
}
