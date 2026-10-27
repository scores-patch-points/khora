// eval/referents/cast-initial.mjs — A CAPITAL THAT IS ONLY THE SENTENCE'S: the cast against UD_English-GUM, bars from PREREG-CAST.md + PREREG-CAST-A1.md.
//
// The cast (read-core.mjs) names a being what the capital tier names. A word the text never writes lower-case, with one capital the sentence cut
// calls mid-sentence ("Grab" after a heading with no full stop), used to pass on that capital. adapters/text/form-usage.js now weighs it against the
// treebank's use of the form. This reads whole GUM documents through the master pipeline (reading.js::readDocument), twice with the same lexicon,
// documents and dials — the rule off (readerOptions.formUsage = null) and on (the default) — and counts what the cast lost.
//
//   GUM_TRAIN=/path/to/en_gum-ud-train.conllu node eval/referents/cast-initial.mjs [--set E|A] [--json out.json]
//
// Without the GUM file (CC BY-SA, not vendored) or a lexicon giver the eval says so and exits 0. Nothing here decides a being; it counts the cast.
//
// Sets (slicesOf's draws, pronoun-golden.mjs):
//   A  30 documents, seed 20261110                                   the DESIGN set: the rule's form was chosen on it (in-sample)
//   E  30 of the 65 set aside by seed 20261140, mulberry32 20261150  the CONFIRMATION set: never read before it was scored once
// Terms. IO: a cast being of one token whose every mention starts a GUM sentence (the parent probe's definition). Gold-overlapping: some mention span
// overlaps a gold coreference mention. Dropped: in the rule-off cast and not in the rule-on cast (matched by sorted surfaces).
// Arms beside the rule: K1 "drop every IO" and K2 "shuffled giver" (the prior's per-form counts permuted across forms, mulberry32 seed 20261160) are
// controls built to FAIL; "narrow" is the repo's THRAX "noun" class alone, reported with no bar.
import fs from "node:fs";
import crypto from "node:crypto";
import { parseGum, slicesOf, rng, shuffled, GUM_TRAIN_SHA256 } from "./pronoun-golden.mjs";
import { readDocument } from "../../native/reading.js";
import { localLexicon } from "../../native/adapters/text/wiktionary-pack.js";
import { priorsFor } from "../../native/the-fold/read-core.mjs";
import { formUsageOf } from "../../native/adapters/text/form-usage.js";
import { classifyWord } from "../../native/adapters/text/wordclass.js";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > 0;
const keyOf = (c) => [...c.allSurfaces].sort().join("/");

/** The draws of the two sets. */
export function setsOf(docs) {
  const s = slicesOf(docs);
  const E = shuffled(s.aside.length, rng(20261150)).slice(0, 30).map((i) => s.aside[i]);
  return { A: s.A, E };
}

/** The pos prior with its per-form tag counts permuted across forms (the K2 control). */
export function shuffledPrior(posPrior, seed = 20261160) {
  const forms = Object.keys(posPrior.forms), order = shuffled(forms.length, rng(seed));
  return { ...posPrior, forms: Object.fromEntries(forms.map((f, i) => [f, posPrior.forms[forms[order[i]]]])) };
}

/** The repo's THRAX "noun" class alone: the narrower reading, reported with no bar. */
export const narrowUsage = (posPrior) => (surface) => {
  const c = classifyWord(String(surface ?? ""), { posPrior });
  if (!c.found || !(c.total > 0)) return null;
  const nominal = c.candidates.filter((x) => x.thraxClass === "noun").reduce((n, x) => n + x.count, 0);
  return { nominal, other: c.total - nominal };
};

async function readArm(docs, readOpts) {
  const out = [];
  for (const d of docs) {
    const text = d.sents.map((s) => s.text).join(" ");
    const e = await readDocument(text, { language: "en", minCharacters: 0, ...readOpts });
    const starts = new Set(); { let p = 0; for (const s of d.sents) { starts.add(p); p += s.text.length + 1; } }
    const offs = []; { let p = 0; for (const s of d.sents) { offs.push(p); p += s.text.length + 1; } }
    const gold = []; d.sents.forEach((s, si) => s.mentions.forEach((m) => gold.push([offs[si] + m.c0, offs[si] + m.c1])));
    out.push({ id: d.id, starts, gold, cast: (e.cast ?? []).map((c) => ({ key: keyOf(c), surfaces: c.allSurfaces, spans: c.mentionSpans ?? [] })), heard: (e.heard ?? []).length });
  }
  return out;
}

const flags = (doc, c) => ({
  single: c.surfaces.every((x) => !/\s/.test(x)),
  io: c.surfaces.every((x) => !/\s/.test(x)) && c.spans.length > 0 && c.spans.every(([a]) => doc.starts.has(a)),
  gold: c.spans.some(([a, b]) => doc.gold.some(([x, y]) => overlap(a, b, x, y))),
});

/** The numbers of one arm against the rule-off read, every bar of the preregistration. */
export function measure(before, after) {
  const m = { cast: 0, castAfter: 0, io: 0, ioGold: 0, ioNoGold: 0, gold: 0, goldAfter: 0, dropped: 0, droppedIO: 0, droppedIOGold: 0, droppedIONoGold: 0, droppedGold: 0, added: 0, droppedMulti: 0, list: [], stays: [] };
  before.forEach((doc, i) => {
    const kept = new Set(after[i].cast.map((c) => c.key)), was = new Set(doc.cast.map((c) => c.key));
    m.added += after[i].cast.filter((c) => !was.has(c.key)).length;
    for (const c of doc.cast) {
      const f = flags(doc, c), drop = !kept.has(c.key);
      m.cast++; if (f.gold) m.gold++; if (f.io) { m.io++; f.gold ? m.ioGold++ : m.ioNoGold++; }
      if (!drop) { m.castAfter++; if (f.gold) m.goldAfter++; if (f.io && !f.gold) m.stays.push({ doc: doc.id, surface: c.surfaces.join("/"), mentions: c.spans.length }); continue; }
      m.dropped++; if (f.gold) m.droppedGold++; if (!f.single) m.droppedMulti++;
      if (f.io) { m.droppedIO++; f.gold ? m.droppedIOGold++ : m.droppedIONoGold++; }
      m.list.push({ doc: doc.id, surface: c.surfaces.join("/"), io: f.io, gold: f.gold, mentions: c.spans.length });
    }
  });
  return m;
}

const pct = (a, b) => (b ? `${(100 * a / b).toFixed(1)}%` : "n/a");
/** Each bar, held / failed / untestable, with its number. */
export function bars(m) {
  const precB = m.gold / Math.max(1, m.cast), precA = m.goldAfter / Math.max(1, m.castAfter);
  const b1 = m.ioNoGold < 10 ? { r: "untestable", n: `${m.droppedIONoGold} of ${m.ioNoGold} initial-only beings without gold dropped (fewer than 10)` } : { r: m.droppedIONoGold / m.ioNoGold >= 0.5 ? "held" : "FAILED", n: `${m.droppedIONoGold} of ${m.ioNoGold} = ${pct(m.droppedIONoGold, m.ioNoGold)} (bar ≥ 50%)` };
  const b2a = m.ioGold === 0 ? true : m.droppedIOGold / m.ioGold <= 0.25, b2b = m.gold === 0 ? true : m.droppedGold / m.gold <= 0.01;
  const b2 = { r: b2a && b2b ? "held" : "FAILED", n: `initial-only with gold dropped ${m.droppedIOGold} of ${m.ioGold} = ${pct(m.droppedIOGold, m.ioGold)} (bar ≤ 25%: ${b2a ? "held" : "FAILED"}); all gold-overlapping dropped ${m.droppedGold} of ${m.gold} = ${pct(m.droppedGold, m.gold)} (bar ≤ 1.0%: ${b2b ? "held" : "FAILED"})` };
  const b3 = { r: precA >= precB ? "held" : "FAILED", n: `share of cast beings with a gold mention ${(100 * precB).toFixed(2)}% before, ${(100 * precA).toFixed(2)}% after` };
  const b4 = { r: m.added === 0 && m.droppedMulti === 0 ? "held" : "FAILED", n: `${m.added} beings added, ${m.droppedMulti} multi-word surfaces dropped` };
  return { B1: b1, B2: b2, B3: b3, B4: b4 };
}

async function main() {
  const file = process.env.GUM_TRAIN || arg("--gum", null);
  if (!file || !fs.existsSync(file)) { console.log("cast-initial: skipped — set GUM_TRAIN to UD_English-GUM's en_gum-ud-train.conllu (CC BY-SA, not vendored)."); return; }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  console.log(`GUM train sha256 ${sha}${sha === GUM_TRAIN_SHA256 ? " (the file the README's numbers were measured on)" : " — NOT the file the README's numbers were measured on"}`);
  const lexicon = localLexicon("en");
  await lexicon.want(["office"]);
  if (!lexicon.giver) { console.log(`cast-initial: skipped — no lexicon giver on this machine (${lexicon.log.at(-1)?.gap ?? "no answer"}).`); return; }
  const setName = arg("--set", "E"), docs = setsOf(parseGum(file))[setName];
  if (!docs) { console.log(`cast-initial: no set ${setName} (A or E)`); return; }
  const posPrior = priorsFor("eng").posPrior;
  if (!posPrior) { console.log("cast-initial: skipped — no pos prior (pos-eng.json) on this machine."); return; }
  console.log(`set ${setName}: ${docs.length} documents`);
  const before = await readArm(docs, { lexicon, readerOptions: { formUsage: null } });
  const after = await readArm(docs, { lexicon });
  const shuf = await readArm(docs, { lexicon, readerOptions: { formUsage: formUsageOf(shuffledPrior(posPrior)) } });
  const narrow = await readArm(docs, { lexicon, readerOptions: { formUsage: narrowUsage(posPrior) } });

  const m = measure(before, after), B = bars(m);
  console.log(`\ncast beings ${m.cast} → ${m.castAfter}; initial-only single-word ${m.io} (${m.ioGold} with a gold mention, ${m.ioNoGold} without)`);
  for (const [k, v] of Object.entries(B)) console.log(`${k}  ${v.r.padEnd(10)} ${v.n}`);
  // B5 is a comparison against the base commit (eval/referents/README.md): it reads two checkouts, not one.
  const k1 = measure(before, before.map((d) => ({ ...d, cast: d.cast.filter((c) => !flags(d, c).io) })));
  const k1b = bars(k1);
  console.log(`\nK1 drop every initial-only being (built to fail B2)      B2 ${k1b.B2.r}: ${k1b.B2.n}`);
  const ms = measure(before, shuf), sb = bars(ms);
  const failed = Object.entries(sb).filter(([, v]) => v.r === "FAILED").map(([k]) => k);
  console.log(`K2 shuffled giver (built to fail at least one of B1–B4)    ${failed.length ? `failed ${failed.join(", ")}` : "held all four: the bars cannot tell a giver from noise"}`);
  for (const [k, v] of Object.entries(sb)) console.log(`     ${k}  ${v.r.padEnd(10)} ${v.n}`);
  const mn = measure(before, narrow);
  console.log(`\nnarrow (THRAX noun only, no bar): dropped ${mn.dropped}; initial-only without gold ${mn.droppedIONoGold} of ${mn.ioNoGold}; gold-overlapping ${mn.droppedGold} of ${mn.gold} = ${pct(mn.droppedGold, mn.gold)}`);
  console.log("\ninitial-only beings without a gold mention that STAY:", m.stays.map((x) => x.surface).join(" ") || "none");
  console.log("\ndropped by the rule:");
  for (const x of m.list) console.log(`  ${x.doc.padEnd(28)} ${x.surface.padEnd(14)} ${x.io ? "initial-only" : "            "} ${x.gold ? "gold" : "no gold"}  mentions ${x.mentions}`);
  const json = arg("--json", null);
  if (json) fs.writeFileSync(json, JSON.stringify({ set: setName, ids: docs.map((d) => d.id), main: m, bars: B, k1: k1b, k2: sb, narrow: { ...mn, list: undefined } }, null, 1));
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
