import fs from "node:fs";
// eval/meaning/run.mjs — claim vs source sentence by MEANING (grammar adapter → EOT claims → language-blind matcher + janus) against the
// wording judge (the vendored Fold falsifier). Sets: The Fold's C3 battery (dev; set FOLD_C3_DIR, default ../the-fold/eval/ants/c3), and
// this folder's held-out, other-language and fresh sets (see PREREG.md for which were seen when). The "oracle" arm reads claims a frontier
// model wrote for the same sentences (oracle-claims.json): a ceiling for the EOT layer, not a product path.
//   node eval/meaning/run.mjs          (V=1 for per-pair verdicts)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { claimsOf, claimsOfK, claimsOfGated, READER } from "../../native/adapters/text/grammar-en.js";
import { verdict } from "../../native/kernel/eot-claim-match.js";
import { janusContradictions } from "../../native/organs/eot-janus.js";
import { makeRelationDefs, loadVerbIndexFile } from "../../native/organs/relation-defs.js";
// relation identity nominated by Wiktionary definitions, read from a cache of REST payloads (FOLD_WIKT_CACHE: <dir>/<word>.json); a word not in
// the cache nominates nothing. FOLD_WIKT_INDEX (a VerbIndex@1 file built from a local Wiktionary by cli/wikt-verbs.mjs) is read instead when set
const WIKT = process.env.FOLD_WIKT_CACHE, WIKT_INDEX = process.env.FOLD_WIKT_INDEX;
// FOLD_WIKT_SLIM: the slim English Wiktionary on this machine (wikt-slim.js) — every verb's senses and every language's glosses, read first
const SLIM = process.env.FOLD_WIKT_SLIM ? (await import("../../native/organs/wikt-slim.js")).openSlim(process.env.FOLD_WIKT_SLIM) : null;
const DEFS = SLIM ? makeRelationDefs((w) => SLIM.entries("en", w)) : WIKT_INDEX ? makeRelationDefs(await loadVerbIndexFile(WIKT_INDEX)) : WIKT ? makeRelationDefs((w) => { try { return JSON.parse(fs.readFileSync(path.join(WIKT, `${w}.json`), "utf8")); } catch { return null; } }) : null;
// every other language: its own grammar (grammar-ud.js) from FOLD_UD_DIR (ud-parser-<lang>.json[.gz], ud-tokenizer-<lang>.json, and when
// present unimorph-<lang>-pos.json.gz); keys glossed from English Wiktionary entries cached in FOLD_WIKT_ENTRIES/<lang>/<word>.json (wiktextract
// entries); a word missing there is appended to MEANING_GLOSS_MISSING, so it can be looked up and the run repeated
const UDG = {};
{
  const { makeGrammar, loadGrammar } = await import("../../native/adapters/text/grammar-ud.js");
  const UDP = await import("../../native/adapters/text/ud-parser.js"), UDT = await import("../../native/adapters/text/ud-tokenize.js");
  const { makeGlossary } = await import("../../native/organs/wikt-gloss.js");
  const E = process.env.FOLD_WIKT_ENTRIES, miss = process.env.MEANING_GLOSS_MISSING;
  const glossary = SLIM ? makeGlossary((lang, w) => SLIM.entries(lang, w)) : E ? makeGlossary((lang, w) => { const f = path.join(E, lang, `${w}.json`); if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8")); if (miss) fs.appendFileSync(miss, `${lang}\t${w}\n`); return null; }) : null;
  // the priors by default (grammar-ud.js loadGrammar); FOLD_UD_DIR reads models being trained instead
  const D = process.env.FOLD_UD_DIR, at = (n) => D && [path.join(D, n), path.join(D, n + ".gz")].find((f) => fs.existsSync(f));
  for (const lang of ["es", "fr", "de", "ja"]) {
    if (!D) { const g = await loadGrammar(lang, { glossary }); if (g) UDG[lang] = g; continue; }
    const m = at(`ud-parser-${lang}.json`), t = at(`ud-tokenizer-${lang}.json`); if (!m || !t) continue;
    const lx = at(`unimorph-${lang}-pos.json`);
    UDG[lang] = makeGrammar(lang, { model: UDP.loadModel(await UDP.readJsonMaybeGz(m), { lex: lx ? await UDP.loadLexiconFile(lx) : null }), tokenizer: UDT.loadTokenizer(await UDP.readJsonMaybeGz(t)), glossary });
  }
}
// a pair's language per side: "es" is both; "es-en" is a Spanish source read against an English claim
// a source sentence's PAGE, where the set names it (pair.source.url, with <set>.sources.json beside the set): the title and the sentences before
// it, so a pronoun or a dropped subject can take the page's topic; split as the set was built (Japanese at 。, else at a sentence end)
let PAGES = null;
const pagesOf = () => { if (!PAGES) { PAGES = new Map(); for (const f of fs.readdirSync(HERE).filter((x) => x.endsWith(".sources.json"))) for (const pg of JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8")).pages ?? []) PAGES.set(pg.url, pg); } return PAGES; };
const sentencesOf = (pg) => (pg.lang === "ja" ? pg.text.replace(/\n+/g, "").split(/(?<=。)/) : pg.text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑÀÂÈÊÎÔÛÄÖÜ«"(])/)).map((x) => x.trim()).filter(Boolean);
const contextOf = (p) => { const pg = p.source?.url && pagesOf().get(p.source.url); if (!pg) return null; const ss = sentencesOf(pg), head = p.sentence.slice(0, 30), i = ss.findIndex((x) => x.startsWith(head)); return { title: pg.title, previous: i > 0 ? ss.slice(0, i) : [] }; };
const sideLang = (lang, side) => { const [src, claim] = String(lang).split("-"); return side === "claim" ? (claim ?? src) : src; };
const HERE = path.dirname(fileURLToPath(import.meta.url));
const F = await import("../../vendor/the-fold/fold-chat-falsify-answer.js");
const lexical = (claim, sentence) => { const r = F.falsifyAnswer([claim], [{ name: "https://src.example/p", text: sentence }]); const c = (r.claims ?? r)[0] ?? {}; const v = c.verdict ?? c.standing; return /corroborated|held/.test(v) ? "E" : /contested/.test(v) ? "C" : "U"; };
// the grammar per pair: English text → the English adapter; any other language → the frontier adapter's claims (frontier-claims.json), else a typed gap
let FR = {}; try { FR = JSON.parse(fs.readFileSync(path.join(HERE, "oracle-claims.json"), "utf8")); } catch {}
const normEnd = (e) => (e && typeof e === "object" ? { text: String(e.text ?? ""), head: String(e.head ?? "").toLowerCase(), names: (e.names ?? []).map((x) => String(x).toLowerCase()), keys: (e.keys ?? []).map((x) => String(x).toLowerCase()), figs: (e.figs ?? []).filter((f) => f && Number.isFinite(+f.base)).map((f) => ({ measure: String(f.measure), base: +f.base, approx: !!f.approx })), quant: e.quant ?? null, agent: normEnd(e.agent) } : null);
// a proposition stands only on words the sentence holds: its span must be inside the text, and each end's text must be in the sentence
const verifySpans = (text, claims) => (claims ?? []).filter((c) => (!c.span || (c.span[0] >= 0 && c.span[1] <= text.length && c.span[1] > c.span[0]))).map((c) => ({ ...c, rel: String(c.rel ?? "").toLowerCase(), ARG0: normEnd(c.ARG0), ARG1: normEnd(c.ARG1), OBL: (c.OBL ?? []).map(normEnd).filter(Boolean), polarity: c.polarity === "-" ? "-" : "+", asserted: c.asserted !== false })).filter((c) => [c.ARG0, c.ARG1, ...c.OBL].filter(Boolean).every((e) => !e.text || text.includes(e.text) || text.replace(/\s+/g, " ").includes(e.text)));
const arms = {
  "grammar-en": (t, lang) => (lang === "en" ? claimsOf(t) : null),
  ...(DEFS ? { "grammar-defs": (t, lang) => (lang === "en" ? claimsOf(t) : null) } : {}),
  // layer 4's gate revising through layer 2's runner-up readings, on both sides
  "grammar-gated": (t, lang) => (lang === "en" ? claimsOfGated(t) : null),
  // the source read under its 3 best parses (the claim under its best): a source states what any close reading of it states
  "grammar-k3": (t, lang, side) => (lang === "en" ? (side === "source" ? claimsOfK(t, 3) : claimsOf(t)) : null),
  // each side read by its own language's grammar: English by grammar-en, the rest by grammar-ud (a language with none is a typed gap)
  ...(Object.keys(UDG).length ? { "grammar-ud": (t, lang, side, ctx) => { const l = sideLang(lang, side); return l === "en" ? claimsOf(t) : UDG[l] ? UDG[l].claimsOf(t, side === "source" && ctx ? { context: ctx } : null) : null; } } : {}),
  oracle: (t) => (FR[t] ? verifySpans(t, FR[t]) : null),
};
// MEANING_ATOMS=1: an "atoms" arm — grammar-ud's verdict, and the claim and its source read as ATOMS (read-atoms.js, the page's referents by the
// learned coreference ranker) and weighed atom by atom (atom-support.js): supported when the claim matcher says so or every claim atom is met,
// contradicted when either finds a contradiction. MEANING_ATOMS=produce adds the learned producer, predicate chooser and filter.
let ATOMS = null, NLI = null;
if (process.env.MEANING_ATOMS && SLIM && arms["grammar-ud"]) {
  const { readAtoms, cleanText } = await import("../../native/organs/read-atoms.js"), { atomSupport, swapFlags } = await import("../../native/kernel/atom-support.js");
  const { matchVerdict, matchUnits } = await import("../../native/kernel/atom-match.js");
  const MATCHER = process.env.MEANING_MATCHER ? JSON.parse(fs.readFileSync(process.env.MEANING_MATCHER, "utf8")) : null;
  // MEANING_VECTORS=<dir>: the aligned word vectors (word-vectors.js) as matcher features
  const VECTORS = process.env.MEANING_VECTORS ? (await import("../../native/organs/word-vectors.js")).loadVectors(process.env.MEANING_VECTORS) : null;
  const { makeGlossary, makeSynonymy, loadTranslations } = await import("../../native/organs/wikt-gloss.js"), { PACKS } = await import("../../native/adapters/text/grammar-packs.js");
  const GE = await import("../../native/adapters/text/grammar-en.js");
  const T = loadTranslations(process.env.FOLD_WIKT_TRANSLATIONS ?? "/Users/mlacy/Downloads/workspace/data/wiktionary-translations");
  const lookup = (l, w) => SLIM.entries(l, w), gl = makeGlossary(lookup, { translations: T }), syn = makeSynonymy({ lookup, translations: T });
  const J = (f) => JSON.parse(fs.readFileSync(path.join(HERE, "atoms", f), "utf8"));
  // "produce": the learned producer on both sides; "produce-source": on the source only (more of what it states; the claim's own atoms unchanged)
  const corefModel = J("coref-ranker.json"), P = /^produce/.test(process.env.MEANING_ATOMS), PS = process.env.MEANING_ATOMS === "produce-source";
  const learned = P ? { producer: J("atom-producer.json"), chooser: J("predicate-chooser.json"), filter: J("produced-filter.json") } : {};
  const grammarOf = (lang) => (lang === "en" ? { rowsOf: GE.rowsOf, claimsOf: (t, rows) => GE.claimsOf(t, rows) } : UDG[lang] ?? null);
  const read = (text, lang, ctx, side = "source") => { const g = grammarOf(lang); if (!g) return null;
    return readAtoms({ text, lang, title: ctx?.title ?? null, previous: ctx?.previous ?? [], grammar: g, pack: PACKS[lang] ?? null, same: (a, b) => syn(lang, a, b, "NOUN").same, lookup, corefModel, keysOf: lang === "en" ? null : (w, u) => gl.all?.(lang, w, u) ?? null, ...(PS && side === "claim" ? {} : learned) }); };
  const keysOf = (lang, w) => [...new Set([...(gl.all?.(lang, w, "NOUN") ?? []), ...(gl.all?.(lang, w, "VERB") ?? []), ...(gl.all?.(lang, w, "ADJ") ?? [])])];
  const same = (lang, a, b) => ["NOUN", "VERB", "ADJ"].some((u) => syn(lang, a, b, u).same);
  ATOMS = (p) => {
    const ctx = contextOf(p), cl = sideLang(p.lang ?? "en", "claim"), sl = sideLang(p.lang ?? "en", "source");
    const A = read(p.claim, cl, ctx ? { title: ctx.title, previous: [] } : null, "claim"), B = read(p.sentence, sl, ctx, "source");
    if (!A || !B) return null;
    const o = { claimLang: cl, sourceLang: sl, same, keysOf, unread: A.unread, sourceText: cleanText(p.sentence).text, vectors: VECTORS };
    // MEANING_MATCHER=<model.json>: the learned matcher decides E (atom-match.js); MEANING_ATOMS_UNITS=<file.jsonl>: its features, for training
    const r = MATCHER ? matchVerdict(A.atoms, B.atoms, o, MATCHER) : atomSupport(A.atoms, B.atoms, o);
    return { ...r, swaps: swapFlags(A.atoms, B.atoms, o), claimAtoms: A.atoms, sourceAtoms: B.atoms, units: process.env.MEANING_ATOMS_UNITS ? matchUnits(A.atoms, B.atoms, o).units.map((u) => ({ what: u.what, options: u.options })) : null };
  };
  arms.atoms = arms["grammar-ud"];
  // MEANING_NLI=<scores.jsonl>:<threshold>: the "nli" arm (PREREG run 20b): contradiction as the atoms arm finds it, else E when the NLI model's
  // entailment probability (nli-score.mjs; sentence as premise, claim as hypothesis) reaches the threshold
  if (process.env.MEANING_NLI) arms.nli = arms["grammar-ud"];
}
const C3 = process.env.FOLD_C3_DIR ?? path.join(HERE, "../../../the-fold/eval/ants/c3");
const sets = { main: path.join(C3, "battery.json"), cf: path.join(C3, "battery-cf.json"), heldout: path.join(HERE, "heldout.json"), other: path.join(HERE, "heldout-other.json"), fresh: path.join(HERE, "fresh.json"), relations: path.join(HERE, "relations.json"), "fresh-ml": path.join(HERE, "fresh-ml.json") };
// MEANING_EXTRA=name=file.json[,name=file.json] adds sets (another session's pairs, say) to this run
for (const kv of (process.env.MEANING_EXTRA ?? "").split(",").filter(Boolean)) { const [k, f] = kv.split("="); sets[k] = f; }
if (process.env.MEANING_ONLY) for (const k of Object.keys(sets)) if (!process.env.MEANING_ONLY.split(",").includes(k)) delete sets[k];
console.log(`reader: ${READER}`);
const out = {};
for (const [name, f] of Object.entries(sets)) {
  if (!fs.existsSync(f)) continue;
  const pairs = JSON.parse(fs.readFileSync(f, "utf8")).pairs;
  const nE = pairs.filter((p) => p.label === "E").length, nNot = pairs.length - nE, nC = pairs.filter((p) => p.label === "C").length;
  console.log(`\n== ${name} (${pairs.length} pairs: ${nE} E, ${nC} C)`);
  const all = { ...Object.fromEntries(Object.keys(arms).map((a) => [a, null])), wording: null };
  for (const arm of Object.keys(all)) {
    let acc = 0, fa = 0, fr = 0, cc = 0, gap = 0; const rows = [];
    // janus over every pair this arm can read, in one call (one ground per pair)
    const jset = arm === "wording" ? new Set() : janusContradictions(pairs.map((p) => ({ id: String(p.id), C: arms[arm](p.claim, p.lang ?? "en", "claim") ?? [], S: arms[arm](p.sentence, p.lang ?? "en", "source", contextOf(p)) ?? [] })).filter((x) => x.C.length && x.S.length));
    for (const p of pairs) {
      const lang = p.lang ?? "en";
      let v;
      if (arm === "wording") v = lexical(p.claim, p.sentence);
      else { const A = arms[arm](p.claim, lang, "claim"), B = arms[arm](p.sentence, lang, "source", contextOf(p)); let why = null; if (!A || !B) { v = "G"; gap++; } else { const r = verdict(A, B, arm === "grammar-defs" || arm === "grammar-ud" || arm === "atoms" ? { relations: DEFS } : {}); v = r.v; why = r.why; if (v !== "C" && jset.has(String(p.id))) { v = "C"; why = "janus"; }
          if (arm === "nli" && v !== "C") { const at = ATOMS(p), [nf, nt] = process.env.MEANING_NLI.split(":"); NLI ??= new Map(fs.readFileSync(nf, "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((r) => [`${r.set}:${r.id}`, r.nli]));
            const e = NLI.get(`${name}:${p.id}`)?.[0]; if (at?.rule?.verdict === "C" || at?.verdict === "C") { v = "C"; why = "atoms"; } else if (e != null && e >= +nt) { v = "E"; why = "nli"; } else v = "N"; }
          if (arm === "atoms" && v !== "C") { const at = ATOMS(p), base = v;
            if (process.env.MEANING_ATOMS_UNITS && at) fs.appendFileSync(process.env.MEANING_ATOMS_UNITS, JSON.stringify({ set: name, id: p.id, label: p.label, lang: p.lang ?? "en", base, rule: at.rule?.verdict ?? at.verdict, units: at.units }) + "\n"); if (at?.verdict === "C") { v = "C"; why = "atoms"; } else if (at?.verdict === "E") { v = "E"; why = "atoms"; } if (process.env.MEANING_ATOMS_DUMP && at) fs.appendFileSync(process.env.MEANING_ATOMS_DUMP, JSON.stringify({ set: name, id: p.id, label: p.label, v, claim: p.claim, sentence: p.sentence, table: at.table.map((t) => ({ atom: t.atom.text, state: t.state, by: t.by?.text ?? null })), unread: at.unread, swaps: at.swaps, source: at.sourceAtoms.map((a) => a.text) }) + "\n"); } }
        // MEANING_DUMP=<file.jsonl>: every pair's verdict, basis and claims, per arm, for the failure breakdown
        if (process.env.MEANING_DUMP) fs.appendFileSync(process.env.MEANING_DUMP, JSON.stringify({ set: name, arm, id: p.id, label: p.label, type: p.type ?? p.why ?? null, v, why, claim: p.claim, sentence: p.sentence, C: A, S: B }) + "\n"); }
      const said = v === "E";
      if ((p.label === "E") === said) acc++; if (said && p.label !== "E") fa++; if (!said && p.label === "E") fr++; if (p.label === "C" && v === "C") cc++;
      rows.push(`${p.id}:${p.label}${v}`);
    }
    console.log(`  ${arm.padEnd(10)} accuracy ${(100 * acc / pairs.length).toFixed(1)}%  false-accept ${(100 * fa / nNot).toFixed(1)}%  false-reject ${(100 * fr / nE).toFixed(1)}%  contradictions ${cc}/${nC}  no-grammar ${gap}`);
    if (process.env.V) console.log("    ", rows.join(" "));
  }
}
