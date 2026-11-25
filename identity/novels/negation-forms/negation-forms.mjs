// negation-forms.mjs — per language, the FREE-STANDING forms a Universal Dependencies treebank's gold marks as negation, with a held-out check.
// Derived data, not a hypothesis test: no preregistration; the split, the giver and the limits are named in README.md and stamped by the sha256 of this file.
//
// GIVER: UD gold annotation, two features. Polarity=Neg (the negative particle: "not", "n't", "nor", Finnish "ei") and PronType=Neg (negative
// pronouns, determiners and adverbs: "nothing", "nobody", "never", "no" as a determiner). English marks "never", "nothing", "nobody", "no" with
// PronType=Neg and NOT with Polarity=Neg, so a list from Polarity=Neg alone misses exactly those. Both are kept, counted apart.
// A form is listed with its UPOS (one word, two parts of speech, two entries). VERB tokens are not listed: where a language marks negation inside
// the verb (Turkish -me-), the form list cannot carry it and the verb's rate is reported instead (`affixalVerbRate`).
// SPLIT: the list is built from a language's TRAIN split only; recall and precision are measured on its DEV split (TEST when there is no dev).
// A language with no train split has its list built from what exists and is marked `heldout: null`: no claim.
//
//   node negation-forms.mjs            writes negation-forms.json and prints the summary
//   node negation-forms.mjs --selftest synthetic data only
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.UD_ROOT ?? "/Users/mlacy/Downloads/workspace/ud-treebanks";
const DOMINANT = 0.5; // a declared dial, reported beside the unfiltered list: a form is "dominant" when at least half of its occurrences (same UPOS) are marked

const isNumeric = (s) => { if (!s.length) return false; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c < 48 || c > 57) return false; } return true; };
const hasFeat = (feats, kv) => { if (feats === "_") return false; for (const p of feats.split("|")) if (p === kv) return true; return false; };

/** one conllu text -> [{ form, lemma, upos, pol, pron }] for syntactic words (multiword ranges and empty nodes skipped) */
export function tokensOf(text) {
  const out = [];
  for (const line of text.split("\n")) {
    if (!line || line.charCodeAt(0) === 35) continue;
    const f = line.split("\t"); if (f.length < 6 || !isNumeric(f[0])) continue;
    out.push({ form: f[1].toLowerCase(), lemma: f[2].toLowerCase(), upos: f[3], pol: hasFeat(f[5], "Polarity=Neg"), pron: hasFeat(f[5], "PronType=Neg") });
  }
  return out;
}
/** tokens -> { entries: Map key -> {...}, verbs, verbPol, tokens } built from a train split */
export function listFrom(tokens) {
  const m = new Map(); let verbs = 0, verbPol = 0;
  for (const t of tokens) {
    if (t.upos === "VERB") { verbs++; if (t.pol) verbPol++; continue; }
    const k = `${t.form}\t${t.upos}`; let e = m.get(k); if (!e) { e = { form: t.form, upos: t.upos, total: 0, polarity: 0, pronTypeNeg: 0, marked: 0, lemmas: new Map() }; m.set(k, e); }
    e.total++; if (t.pol) e.polarity++; if (t.pron) e.pronTypeNeg++; if (t.pol || t.pron) e.marked++; e.lemmas.set(t.lemma, (e.lemmas.get(t.lemma) ?? 0) + 1);
  }
  const entries = [...m.values()].filter((e) => e.marked > 0).map((e) => ({ form: e.form, upos: e.upos, lemma: [...e.lemmas].sort((a, b) => b[1] - a[1])[0][0], polarity: e.polarity, pronTypeNeg: e.pronTypeNeg, total: e.total, markedShare: +(e.marked / e.total).toFixed(3) })).sort((a, b) => b.polarity + b.pronTypeNeg - a.polarity - a.pronTypeNeg);
  return { entries, verbs, verbPol, tokens: tokens.length };
}
/** the list against a held-out token list: recall over its marked free-standing tokens, precision over its tokens whose form+UPOS is listed */
export function checkAgainst(entries, tokens, share = 0) {
  const listed = new Set(entries.filter((e) => e.markedShare >= share).map((e) => `${e.form}\t${e.upos}`));
  let neg = 0, covered = 0, inList = 0, hit = 0;
  for (const t of tokens) { if (t.upos === "VERB") continue; const marked = t.pol || t.pron, k = `${t.form}\t${t.upos}`; if (marked) { neg++; if (listed.has(k)) covered++; } if (listed.has(k)) { inList++; if (marked) hit++; } }
  return { markedTokens: neg, recall: neg ? covered / neg : null, listedTokens: inList, precision: inList ? hit / inList : null };
}

// ── the run ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const EXTRA = [{ code: "en", repo: "UD_English-EWT (copy in eo-lexical-analysis/data/crossling/English)", dir: "/Users/mlacy/eo-lexical-analysis/data/crossling/English", licence: "CC BY-SA 4.0 (UD_English-EWT's published licence; not verified from this copy)", commit: null }];
/** every treebank directory with data, grouped by language code (the UD file-name prefix) */
function candidates() {
  const prov = new Map(fs.readFileSync(path.join(ROOT, "PROVENANCE.tsv"), "utf8").split("\n").slice(1).filter(Boolean).map((l) => { const c = l.split("\t"); return [c[0], c[1]]; }));
  const lic = new Map(fs.readFileSync(path.join(ROOT, "INVENTORY.tsv"), "utf8").split("\n").slice(1).filter(Boolean).map((l) => { const c = l.split("\t"); return [c[0], c[7] ?? ""]; }));
  const dirs = fs.readdirSync(ROOT).filter((d) => d.startsWith("UD_")).sort().map((repo) => ({ repo, dir: path.join(ROOT, repo), commit: prov.get(repo) ?? null, licence: lic.get(repo) ?? "" })).concat(EXTRA.map((e) => ({ ...e, extra: true })));
  const byCode = new Map();
  for (const d of dirs) for (const f of fs.readdirSync(d.dir).filter((x) => x.endsWith(".conllu"))) {
    const m = f.indexOf("_"); if (m < 1) continue; const split = ["train", "dev", "test"].find((s) => f.endsWith(`-ud-${s}.conllu`)); if (!split) continue;
    const code = f.slice(0, m); if (d.extra && code !== d.code) continue;
    const e = byCode.get(code) ?? byCode.set(code, new Map()).get(code); const r = e.get(d.repo) ?? e.set(d.repo, { ...d, files: {} }).get(d.repo); r.files[split] = path.join(d.dir, f);
  }
  return byCode;
}

function run() {
  const langs = {};
  for (const [code, repos] of [...candidates()].sort((a, b) => a[0].localeCompare(b[0]))) {
    // each candidate with a train split builds its list; the language keeps the treebank whose gold marks the most negation (ties: the larger train); with no train anywhere, what exists
    const built = [];
    for (const r of repos.values()) { const file = r.files.train ?? r.files.dev ?? r.files.test, b = listFrom(tokensOf(fs.readFileSync(file, "utf8"))); built.push({ r, b, hasTrain: !!r.files.train, marked: b.entries.reduce((s, e) => s + e.polarity + e.pronTypeNeg, 0) }); }
    built.sort((x, y) => (y.hasTrain - x.hasTrain) || (y.marked - x.marked) || (y.b.tokens - x.b.tokens));
    const { r, b, hasTrain } = built[0], annotated = b.entries.length > 0, evalFile = hasTrain ? (r.files.dev ?? r.files.test ?? null) : null;
    const entry = { name: r.repo.slice(3).split("-")[0].split(" ")[0], treebank: r.repo, commit: r.commit, licence: r.licence, nc: /NC/i.test(r.licence), builtFrom: hasTrain ? "train" : (r.files.dev ? "dev" : "test") + " (no train split)", candidatesConsidered: built.length, trainTokens: b.tokens, annotated, affixalVerbRate: b.verbs ? +(b.verbPol / b.verbs).toFixed(4) : null, entries: b.entries, heldout: null };
    if (evalFile) { const t = tokensOf(fs.readFileSync(evalFile, "utf8")); entry.heldout = { split: path.basename(evalFile).includes("-dev") ? "dev" : "test", file: path.basename(evalFile), allListed: checkAgainst(b.entries, t, 0), dominantOnly: { share: DOMINANT, ...checkAgainst(b.entries, t, DOMINANT) } }; }
    langs[code] = entry;
  }
  const out = { schema: "NegationForms@1", giver: "Universal Dependencies gold annotation: Polarity=Neg and PronType=Neg on free-standing words (VERB tokens not listed)", split: "list from the train split; recall and precision on dev (test if no dev)", selection: "per language, the treebank whose train gold marks the most free-standing negation", dominantDial: DOMINANT, generatedFor: "reader item 6 (negation marks), 2026-11-24", languages: langs };
  fs.writeFileSync(path.join(HERE, "negation-forms.json"), JSON.stringify(out));
  const L = Object.entries(langs), annotated = L.filter(([, v]) => v.annotated), held = annotated.filter(([, v]) => v.heldout && v.heldout.allListed.markedTokens >= 20);
  const m = (f) => { const xs = held.map(([, v]) => f(v)).filter((x) => x != null); return xs.reduce((a, b) => a + b, 0) / xs.length; };
  const summary = { languages: L.length, withAnnotatedFreeNegators: annotated.length, noFreeNegatorsAnnotated: L.length - annotated.length, nonCommercialSources: L.filter(([, v]) => v.nc).length, languagesWithHeldOutCheck20Plus: held.length, macroRecallAllListed: m((v) => v.heldout.allListed.recall), macroPrecisionAllListed: m((v) => v.heldout.allListed.precision), macroRecallDominant: m((v) => v.heldout.dominantOnly.recall), macroPrecisionDominant: m((v) => v.heldout.dominantOnly.precision), english: langs.en ? { treebank: langs.en.treebank, builtFrom: langs.en.builtFrom, heldout: langs.en.heldout, entries: langs.en.entries.slice(0, 16).map((e) => `${e.form}/${e.upos} pol${e.polarity} pron${e.pronTypeNeg} of ${e.total}`) } : null, languagesWithAffixalNegationOver2PctOfVerbs: L.filter(([, v]) => v.affixalVerbRate != null && v.affixalVerbRate > 0.02).length };
  console.log(JSON.stringify(summary, (k, v) => (typeof v === "number" ? +v.toFixed(3) : v), 1));
}

function selftest() {
  let bad = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.error(`FAIL ${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } else console.log(`ok   ${m}`); };
  const text = ["1\tI\tI\tPRON\t_\t_\t3\tnsubj\t_\t_", "2\tdo\tdo\tAUX\t_\t_\t3\taux\t_\t_", "3-4\tdon't\t_\t_\t_\t_\t_\t_\t_\t_", "3\tnot\tnot\tPART\t_\tPolarity=Neg\t4\tadvmod\t_\t_", "4\tknow\tknow\tVERB\t_\tPolarity=Neg\t0\troot\t_\t_", "5\tnothing\tnothing\tPRON\t_\tPronType=Neg\t4\tobj\t_\t_", "6\tno\tno\tDET\t_\tPronType=Neg\t7\tdet\t_\t_", "7\tone\tone\tNOUN\t_\t_\t4\tobj\t_\t_", "8\tno\tno\tINTJ\t_\t_\t4\tdiscourse\t_\t_"].join("\n");
  const toks = tokensOf(text); eq(toks.length, 8, "multiword ranges are skipped");
  const b = listFrom(toks); eq(b.entries.map((e) => `${e.form}/${e.upos}`).sort(), ["no/DET", "not/PART", "nothing/PRON"], "free-standing marked forms are listed with their UPOS; the VERB is not");
  eq(b.verbPol, 1, "a negated verb is counted, not listed");
  const c = checkAgainst(b.entries, toks, 0); eq([c.markedTokens, c.recall, c.precision], [3, 1, 1], "on its own tokens the list covers the marked ones and the INTJ 'no' is a different entry");
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1); } console.log("selftest passed");
}
if (process.argv.includes("--selftest")) selftest(); else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
