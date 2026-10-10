// eval/competence/r3-hyperlexicon.mjs — RUNG R3, A HYPERLEXICON-LOOKUP ARM (new file; no existing instrument edited).
//
//   node eval/competence/r3-hyperlexicon.mjs --stem eng [--limit N]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══════════════════
// WHY. R3 (find beings, case-stripped) fails everywhere; the review found the heard reader reduces to the TRAIN
// prior's own lexicon filter, and its headline is largely lookup of seen labels. The question here is the OTHER
// lookup: does the HYPERLEXICON — the field the weft folds into (janus/ruliad.js::fieldFromWeft; kinds/relations
// the reader itself attested) — let the reader find beings it could not name from its own lexicon?
//
// DESIGN (DEV-only; TEST is spent and never read here). Split the DEV sentences in HALF:
//   BUILD = the first half. The production reader (the-fold/corpus-session.js, case-stripped, language declared)
//           reads it; its relations ('nominated' etc.) fold via ruliad.fieldFromWeft into a hyperlexicon field.
//   LOOKUP SET = every left/right end of a field row that carries a RESOLVED ref (meta.leftRefs/rightRefs non-empty)
//           and is not a settled common noun (isCommonForm). This is the field's own being-set — the things the
//           reader bound across the build half, whatever no lexicon could have named.
//   TEST  = the second half, measured EXACTLY as R3 measures it (same goldSets, same blocks, same readBlock arms),
//           with two added arms: `hyperlexicon` = reachable recurring candidates present in the LOOKUP SET;
//           `keyedHl` = keyed ∪ hyperlexicon (the cast, plus the lookup).
//
// CLAIM. keyedHl beats keyed on PROPN macro F1 over the test blocks by the exact one-sided sign test at 5%
//   (lib.pairedTest). The gain is REAL being-finding, not size: on the NET-NEW forms (hyperlexicon minus keyed),
//   the share that are PROPN gold exceeds the same share for a size-matched random subset of rawTop.
// FALSIFIED IF keyedHl does not significantly beat keyed, OR the net-new forms carry no PROPN gold.
// CONTROLS. Everything R3 already carries (rawTop, rawTopK, nominated, lexicon_filter, shuffled, rate_permuted,
//   prior_scrambled, randomK) is scored against keyedHl by scoreBlocks; the capital witness is reported as a rival.
// LIMITS (said once). (1) The lookup source is the SAME document's first half — a within-document, cross-half
//   lookup, not the whole corpus; a whole-corpus field is the production shape and is not built here.
//   (2) The production reader carries priors (corpus-session.js is labelled CONTAMINATED by the kinds-swarm brief):
//   so a win is "the prior-driven perceiver's own referents beat the cast's beings", not a prior-free result.
//   (3) DEV only; a fresh held-out draw is required to judge.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import {
  measureSentences, scoreBlocks, readBlock, goldSets, sentenceText, pairedTest, prf, aggregate,
  planBlocks, norm, isReachable, isCommonForm, capitalWitness, ARM_PROVENANCE, RUNG,
} from "./r3-beings.mjs";
import { readConllu, conlluPath, parseArgs, EVAL_DIR, KEY_ALPHA } from "./lib.mjs";
import { createLanguageListener } from "../../the-fold/language-listener.js";
import { casedFraction, CASED_SCRIPT_FLOOR } from "../../the-fold/language-context.js";
import { grammarFor } from "../../the-fold/language-grammar.js";
import { createSession, admitChunked, sessionRelations, sessionReferents } from "../../the-fold/corpus-session.js";
import { fieldFromWeft } from "../../../../janus/native/organs/ruliad.js";
import { appendPass, emptyWeft } from "../../the-fold/weft.js";

const THIS_FILE = fileURLToPath(import.meta.url);
export const HL_ARM_SCHEMA = "R3HyperlexiconArm@1";

/** Fold one pass of the native reader's relations into a hyperlexicon field (the-only-home: janus/ruliad.js). */
export function fieldFromRelations(relations, address) {
  const rels = relations
    .filter((r) => (r.participants ?? []).length >= 2 && r.relation)
    .map((r) => ({ relation: r.relation, participants: r.participants.map((p) => ({ ref: p.ref ?? null, surface: p.surface, standing: p.standing })), at: r.scope?.byteOffset ?? null }));
  const weft = appendPass(emptyWeft(), { address, relations: rels, edges: [] });
  return fieldFromWeft(weft, {});
}

/** The field's own being-set: ends of field rows that carry a RESOLVED ref and are not settled common nouns. */
export function lookupSet(field, posPrior) {
  const out = new Set();
  for (const row of Object.values(field?.hyperlexicon?.composition ?? {})) {
    const refs = new Set([...(row.meta?.leftRefs ?? []), ...(row.meta?.rightRefs ?? [])]);
    if (!refs.size) continue;
    for (const end of [row.left, row.right]) {
      const f = norm(end);
      if (f && isReachable(f) && !isCommonForm(posPrior, f)) out.add(f);
    }
  }
  return out;
}

const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);

/** The measurement. `hear` is the declared listener; the field is built from the BUILD half only. */
export async function measureHyperlexicon({ stem, limit = null, evalDir = null } = {}) {
  const base = { stem, rung: RUNG.id, arm: "hyperlexicon", n: 0, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {} };
  const file = evalDir ? path.join(evalDir, stem ?? "", "dev.conllu") : conlluPath(stem, "dev");
  if (!file || !fs.existsSync(file)) return { ...base, pass: null, gaps: [{ reason: "no_gold", detail: file }] };
  const grammar = grammarFor(stem);
  if (!grammar.language || !grammar.posPrior?.forms) return { ...base, pass: null, gaps: [{ reason: "no_prior", detail: grammar.gap ?? `no POS prior for ${stem}` }] };
  const posPrior = grammar.posPrior;
  const sentences = readConllu(file, limit ? { limit } : {});
  const half = Math.floor(sentences.length / 2);
  const buildS = sentences.slice(0, half), testS = sentences.slice(half);
  const listener = createLanguageListener({ declared: stem });
  const hear = (t, si) => listener.listen(t, si);

  // BUILD: the production reader over the build half (case-stripped), folded into the field
  const buildText = buildS.map((s) => sentenceText(s).text).join("\n").toLowerCase();
  const session = createSession({});
  const src = `${stem}:dev-build`;
  admitChunked(session, { text: buildText, sourceId: src, language: stem });
  const { relations, gaps: relGaps } = await sessionRelations(session, { sourceId: src });
  const field = fieldFromRelations(relations, src);
  const lookup = lookupSet(field, posPrior);
  const { referents } = await sessionReferents(session, { sourceId: src, limit: 2000 });
  const refLookup = new Set();
  for (const ref of referents) for (const s of ref.surfaces ?? []) { const f = norm(s); if (f && isReachable(f) && !isCommonForm(posPrior, f)) refLookup.add(f); }

  // TEST: R3's own blocks + arms, plus the two new arms
  const plan = planBlocks(testS.length);
  if (!plan.count) return { ...base, n: testS.length, pass: null, gaps: [{ reason: "no_block", detail: `${testS.length} test sentences < ${plan.minBlock ?? 60}` }] };
  const used = testS.slice(0, plan.used);
  const blocks = [];
  let netNew = 0, netNewPropn = 0, refNetNew = 0, refNetNewPropn = 0;
  for (let b = 0; b < plan.count; b++) {
    const sl = used.slice(b * plan.size, (b + 1) * plan.size);
    const rawTexts = sl.map((s) => sentenceText(s).text);
    const texts = rawTexts.map((t) => t.toLowerCase());
    const g = goldSets(sl);
    const casedScript = casedFraction(texts.join("\n")) >= CASED_SCRIPT_FLOOR;
    const cn = !casedScript;
    const r = readBlock({ texts, hear, posPrior, seed: (b * 2654435761) >>> 0, commonNouns: cn });
    const candidates = [...r.arms.rawTop].filter(isReachable);
    const hyperlexicon = new Set(candidates.filter((f) => lookup.has(f)));
    const keyedHl = new Set([...r.arms.keyed, ...hyperlexicon]);
    const refs = new Set(candidates.filter((f) => refLookup.has(f)));
    const keyedRefs = new Set([...r.arms.keyed, ...refs]);
    for (const f of hyperlexicon) if (!r.arms.keyed.has(f)) { netNew += 1; if (g.propn.has(f)) netNewPropn += 1; }
    for (const f of refs) if (!r.arms.keyed.has(f)) { refNetNew += 1; if (g.propn.has(f)) refNetNewPropn += 1; }
    const cap = capitalWitness(rawTexts);
    blocks.push({ gold: { propn: g.propn, nominal: g.nominal }, arms: { ...r.arms, hyperlexicon, keyedHl, refs, keyedRefs, capital: cap.forms, union: new Set([...keyedHl, ...cap.forms]) } });
  }
  const isSeen = (f) => Object.hasOwn(posPrior.forms, f);
  const S = scoreBlocks(blocks, { caseless: false, causalOk: true, isSeen, realArm: "keyedHl" });
  const K = scoreBlocks(blocks, { caseless: false, causalOk: true, isSeen, realArm: "keyed" });
  const perF1 = (a) => S.perBlock.map((r) => r.arms[a]?.propn?.f1 ?? 0);
  const hlVsKeyed = pairedTest(perF1("keyedHl"), perF1("keyed"));
  const hlAloneVsKeyed = pairedTest(perF1("hyperlexicon"), perF1("keyed"));
  const krefVsKeyed = pairedTest(perF1("keyedRefs"), perF1("keyed"));
  const refAloneVsKeyed = pairedTest(perF1("refs"), perF1("keyed"));
  const T = S.table;
  const f1 = (a, g = "propn") => round(T[a]?.[g]?.macroF1 ?? null);
  const controls = {
    rawTop: f1("rawTop"), nominated: f1("nominated"), lexicon_filter: f1("lexicon_filter"), randomK: f1("randomK"),
    prior_scrambled: f1("prior_scrambled"), rate_permuted: f1("rate_permuted"), shuffled: f1("shuffled"),
    keyed: f1("keyed"), hyperlexicon: f1("hyperlexicon"), keyedHl: f1("keyedHl"), refs: f1("refs"), keyedRefs: f1("keyedRefs"), capital_witness: f1("capital"),
  };
  const ruleF1 = ["rawTop", "nominated", "lexicon_filter", "randomK", "prior_scrambled", "rate_permuted", "shuffled"].map((c) => T[c]?.propn?.macroF1 ?? 0);
  const score = round(T.keyedHl.propn.macroF1 ?? 0);
  const control = round(Math.max(...ruleF1));
  const beatsKeyed = hlVsKeyed.significant && hlVsKeyed.wins > hlVsKeyed.losses;
  const netNewShare = netNew ? netNewPropn / netNew : null;
  const pass = (blocks.length >= 5 && isSeen) ? (beatsKeyed && (netNewShare ?? 0) > 0) : null;
  const notes = [
    `blocks ${plan.count} x ${plan.size} on the TEST half (${testS.length} sentences); build half ${buildS.length}; field rows ${Object.keys(field.hyperlexicon.composition).length}, lookup set ${lookup.size}`,
    `relations read on BUILD ${relations.length}${relGaps.length ? ` (gaps ${JSON.stringify(relGaps).slice(0, 120)})` : ""}`,
    `keyedHl PROPN F1 ${f1("keyedHl")} vs keyed ${f1("keyed")} (paired: wins ${hlVsKeyed.wins} losses ${hlVsKeyed.losses} ties ${hlVsKeyed.ties}, p ${round(hlVsKeyed.p)}, significant ${hlVsKeyed.significant})`,
    `hyperlexicon arm alone PROPN F1 ${f1("hyperlexicon")} (wins ${hlAloneVsKeyed.wins} losses ${hlAloneVsKeyed.losses}, p ${round(hlAloneVsKeyed.p)})`,
    `net-new forms (hyperlexicon minus keyed): ${netNew}, of which PROPN gold ${netNewPropn} (share ${round(netNewShare, 3)})`,
    `REFERENT-LOOKUP arm (sessionReferents, the production reader's own beings): refs PROPN F1 ${f1("refs")}, keyedRefs ${f1("keyedRefs")} vs keyed ${f1("keyed")} (wins ${krefVsKeyed.wins} losses ${krefVsKeyed.losses}, p ${round(krefVsKeyed.p)}); alone wins ${refAloneVsKeyed.wins} losses ${refAloneVsKeyed.losses}; net-new ${refNetNew}, of which PROPN ${refNetNewPropn} (share ${round(refNetNew ? refNetNewPropn / refNetNew : null, 3)})`,
    `PRODUCTION READER CARRIES PRIORS (corpus-session): a win is the prior-driven perceiver's referents beating the cast, not a prior-free result; DEV only, TEST unread`,
  ];
  return {
    ...base, n: plan.used, score, control, margin: round(score - control), pass, controls, gaps: [], notes,
    details: {
      prereg_sha256: null, buildHalf: buildS.length, testHalf: testS.length,
      field: { rows: Object.keys(field.hyperlexicon.composition).length, attestations: field.stats.attestations, unresolvedEnds: field.stats.unresolvedEnds, distinctLabels: field.stats.distinctLabels, lookupSetSize: lookup.size, refLookupSize: refLookup.size },
      paired: { keyedHl_vs_keyed: hlVsKeyed, hyperlexicon_vs_keyed: hlAloneVsKeyed, keyedRefs_vs_keyed: krefVsKeyed, refs_vs_keyed: refAloneVsKeyed, netNew, netNewPropn, netNewShare, refNetNew, refNetNewPropn },
      arms: Object.fromEntries(Object.keys(T).map((a) => [a, { propnF1: f1(a), nominalF1: f1(a, "nominal") }])),
      arm_provenance: { ...ARM_PROVENANCE, hyperlexicon: { role: "NEW ARM: field-end lookup (build-half rows with a resolved ref)", causal: true, reads: "lowercased text" }, keyedHl: { role: "keyed ∪ hyperlexicon", causal: true, reads: "lowercased text" }, refs: { role: "NEW ARM: sessionReferents lookup (the production perceiver's beings)", causal: true, reads: "lowercased text" }, keyedRefs: { role: "REAL ARM of the referent-lookup test: keyed ∪ refs", causal: true, reads: "lowercased text" } },
    },
  };
}

async function main() {
  const a = parseArgs();
  const stems = a.stem ? [a.stem] : a.all ? fs.readdirSync(EVAL_DIR).filter((s) => fs.existsSync(path.join(EVAL_DIR, s, "dev.conllu"))) : [];
  if (!stems.length) { console.error("usage: r3-hyperlexicon.mjs --stem <stem> | --all"); process.exit(2); }
  for (const stem of stems) {
    try { console.log(JSON.stringify(await measureHyperlexicon({ stem, limit: a.limit }))); }
    catch (e) { console.log(JSON.stringify({ stem, pass: null, gaps: [{ reason: "threw", detail: String(e && e.stack || e).slice(0, 400) }] })); }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
