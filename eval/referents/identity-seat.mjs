// eval/referents/identity-seat.mjs — THE NECESSITY OF AN OPINION AT THE IDENTITY SEAT: which pairs of mentions the mechanics leave open, and how right they are where they decide (pre-registered: PREREG-IDENTITY-SEAT.md).
//
// No model is called. It reads English (UD_English-GUM test) and Russian (UD_Russian-GSD dev) through the reader's own core with the ledger on (`referents: true`, and the declension fold for Russian) and
// classifies every pair of gold names the plain cast covers by what the mechanics did with it (ledger-opinion.js::classifyPair), against the gold relation (same or different).
//
//   GUM_TEST=…/en_gum-ud-test.conllu RU_DEV=…/ru_gsd-ud-dev.conllu WIKTIONARY_READER=… node eval/referents/identity-seat.mjs [--slice E1,R1] [--out f.json]
import fs from "node:fs";
import { readDocument } from "../../native/reading.js";
import { readWith } from "../../native/the-fold/read-core.mjs";
import { localLexicon } from "../../native/adapters/text/wiktionary-pack.js";
import { classifyPair, PAIR_CLASSES, CONTESTABLE } from "../../native/adapters/text/ledger-opinion.js";
import { parseGum, scoreDocument as pronounScore } from "./pronoun-golden.mjs";
import { goldNames } from "./referent-read.mjs";
import { parseUd } from "./declension-ru.mjs";

const D = "/Users/mlacy/Downloads/workspace/data/ud";
const FILES = { E1: process.env.GUM_TEST || `${D}/UD_English-GUM/en_gum-ud-test.conllu`, R1: process.env.RU_DEV || `${D}/UD_Russian-GSD/ru_gsd-ud-dev.conllu` };
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c);

/** the ledger's mentions of cast beings, with their text and referent id; and the context the classes need */
function ledgerView(entry) {
  const L = entry.referents; if (!L) return { mentions: [], ctx: { unearned: new Set(), split: new Map() } };
  const byId = new Map(L.spans.map((s) => [s.id, s])), mentions = [];
  for (const r of L.referents) if (r.standing === "referent") for (const sid of r.mentions) { const s = byId.get(sid); if (s?.kind === "name") mentions.push({ a: s.at[0], b: s.at[1], label: r.id, text: s.text }); }
  const unearnedEngines = new Set(entry.gaps.filter((g) => g.gap === "referent_merge_unearned").map((g) => g.plain));
  const unearned = new Set(L.referents.filter((r) => unearnedEngines.has(r.engine)).map((r) => r.id));
  const split = new Map(L.referents.filter((r) => r.split).map((r) => [r.id, r.split.from]));
  return { mentions, ctx: { unearned, split } };
}
const pick = (g, spans) => { let best = null, bo = 0; for (const s of spans) { const ov = overlap(g.a, g.b, s.a, s.b); if (ov > bo || (ov === bo && ov > 0 && (s.a < best.a || (s.a === best.a && s.b - s.a > best.b - best.a)))) { bo = ov; best = s; } } return best; };

/** one document's items: [{ gold, label, text }] over the gold names a plain cast span covers, labelled by the ledger */
function items(entry, names) {
  const plain = []; for (const c of entry.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) plain.push({ a, b });
  const { mentions, ctx } = ledgerView(entry);
  const out = [];
  for (const g of names) {
    if (!plain.some((s) => overlap(g.a, g.b, s.a, s.b) > 0)) continue;
    const m = pick(g, mentions);
    out.push({ gold: g.ent ?? g.key, label: m ? m.label : null, text: m ? m.text : "" });
  }
  return { items: out, ctx };
}

export const emptyTally = () => Object.fromEntries(PAIR_CLASSES.map((c) => [c, { n: 0, same: 0 }]));
export function tally(docItems, T = emptyTally()) {
  for (const { items: it, ctx } of docItems) for (let i = 0; i < it.length; i++) for (let j = i + 1; j < it.length; j++) { const c = classifyPair(it[i], it[j], ctx), t = T[c]; t.n++; if (it[i].gold === it[j].gold) t.same++; }
  return T;
}
/** the mechanics' verdict accuracy per class: SAME_* is right when gold is same, DIFF_* and DIFF_SPLIT when gold is different; UNDECIDED has none */
export const accuracy = (c, t) => (t.n === 0 ? null : c === "UNDECIDED" ? null : (c.startsWith("SAME") ? t.same : t.n - t.same) / t.n);

/** the shuffled baseline: the ledger's labels permuted among the mentions of each document (their texts stay), 199 draws; per-class accuracy distribution */
function shuffledNull(docItems, draws, seed) {
  const r = rng(seed), acc = Object.fromEntries(PAIR_CLASSES.map((c) => [c, []]));
  for (let d = 0; d < draws; d++) {
    const T = emptyTally();
    for (const { items: it, ctx } of docItems) {
      const labels = it.map((x) => x.label), idx = it.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      tally([{ items: it.map((x, i) => ({ ...x, label: labels[idx[i]] })), ctx }], T);
    }
    for (const c of PAIR_CLASSES) { const a = accuracy(c, T[c]); if (a != null) acc[c].push(a); }
  }
  return Object.fromEntries(PAIR_CLASSES.map((c) => { const v = acc[c].sort((a, b) => a - b); return [c, v.length ? { mean: v.reduce((x, y) => x + y, 0) / v.length, p95: v[Math.ceil(0.95 * v.length) - 1], draws: v.length } : null]; }));
}

export function summarise(name, docItems, gapCounts, extra = {}) {
  const T = tally(docItems), nul = shuffledNull(docItems, 199, 20261128), rows = {};
  let pairs = 0; for (const c of PAIR_CLASSES) pairs += T[c].n;
  for (const c of PAIR_CLASSES) {
    const t = T[c], acc = accuracy(c, t), sameShare = t.n ? t.same / t.n : null;
    rows[c] = { pairs: t.n, goldSame: t.same, goldSameShare: sameShare, verdictAccuracy: acc, majorityAccuracy: sameShare == null ? null : Math.max(sameShare, 1 - sameShare), shuffled: nul[c], aboveShuffledP95: acc != null && nul[c] ? acc > nul[c].p95 : null };
  }
  const contestable = CONTESTABLE.reduce((n, c) => n + T[c].n, 0);
  const error = { fission_goldSame_keptApart: T.DIFF_SHARED.same + T.DIFF_DISJOINT.same + T.DIFF_SPLIT.same, fusion_goldDifferent_joined: (T.SAME_FORM.n - T.SAME_FORM.same) + (T.SAME_VARIANT.n - T.SAME_VARIANT.same) };
  return { slice: name, documents: docItems.length, names: docItems.reduce((n, d) => n + d.items.length, 0), pairs, strictNecessity: T.UNDECIDED.n, contestable, contestableShare: pairs ? contestable / pairs : null, error, classes: rows, typedGaps: gapCounts, ...extra };
}

async function main() {
  const want = arg("--slice", "E1,R1").split(","), report = { prereg: "PREREG-IDENTITY-SEAT.md", slices: {} };
  const f3 = (x) => (x == null ? "  -  " : x.toFixed(3));
  for (const name of want) {
    const docItems = [], gapCounts = {}; let extra = {};
    if (name === "E1") {
      const lexicon = localLexicon("en"); await lexicon.want(["office"]);
      if (!lexicon.giver) { console.log(`identity-seat: ${name} skipped — no lexicon giver (${lexicon.log.at(-1)?.gap ?? "no answer"})`); continue; }
      const docs = parseGum(FILES.E1).filter((d) => d.sents.length >= 20).sort((a, b) => (a.id < b.id ? -1 : 1));
      let answerable = 0, right = 0, wrong = 0;
      for (const d of docs) {
        const { text, names } = goldNames(d);
        const e = await readDocument(text, { language: "en", minCharacters: 0, lexicon, referents: true });
        docItems.push(items(e, names));
        for (const g of e.gaps ?? []) gapCounts[g.gap] = (gapCounts[g.gap] ?? 0) + 1;
        const p = await pronounScore(d, { lexicon }); answerable += p.answerable; right += p.right; wrong += p.wrong;
      }
      extra = { pronouns: { answerable, boundRight: right, boundWrong: wrong, unboundUndecided: answerable - right - wrong, coverage: answerable ? (right + wrong) / answerable : null, precision: right + wrong ? right / (right + wrong) : null, typedGapsForUnbound: 0, note: "the resolver's gaps do not reach the entry, so none of the unbound pronouns is typed" } };
    } else if (name === "R1") {
      for (const d of parseUd(FILES.R1)) {
        const e = readWith(d.text, { language: "ru", minCharacters: 0, referents: true, declension: true });
        docItems.push(items(e, d.names));
        for (const g of e.gaps ?? []) gapCounts[g.gap] = (gapCounts[g.gap] ?? 0) + 1;
      }
    } else throw new Error(`unknown slice ${name}`);
    const S = summarise(name, docItems, gapCounts, extra); report.slices[name] = S;
    console.log(`\nslice ${name}: ${S.documents} documents, ${S.names} gold names covered, ${S.pairs} pairs; strict necessity (UNDECIDED) ${S.strictNecessity}; contestable ${S.contestable} (${f3(S.contestableShare)} of pairs)`);
    console.log("class          pairs   gold-same  verdict-acc  majority  shuffled mean / p95   above p95");
    for (const c of PAIR_CLASSES) { const r = S.classes[c]; console.log(c.padEnd(14), String(r.pairs).padStart(7), f3(r.goldSameShare).padStart(10), f3(r.verdictAccuracy).padStart(12), f3(r.majorityAccuracy).padStart(9), `${f3(r.shuffled?.mean)} / ${f3(r.shuffled?.p95)}`.padStart(21), String(r.aboveShuffledP95).padStart(10)); }
    console.log("errors:", JSON.stringify(S.error), "| typed gaps:", JSON.stringify(S.typedGaps));
    if (S.pronouns) console.log("pronouns:", JSON.stringify(S.pronouns));
  }
  const out = arg("--out", null); if (out) fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
