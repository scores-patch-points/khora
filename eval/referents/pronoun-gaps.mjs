// eval/referents/pronoun-gaps.mjs — THE UNBOUND PRONOUNS, TYPED ON THE ENTRY: the real pipeline against UD_English-GUM's coreference; bars from PREREG-PRONOUN-GAPS.md.
//
// The pronoun golden (pronoun-golden.mjs) counts what the reader BOUND. Most answerable pronouns are not bound, and nothing on the entry said why: the resolver
// files its gaps, the organ dropped them, and a frame the refused regime does not read files none. `readerOptions.pronounGaps: true` makes the read file every
// pronoun of the resolver's own class that it did not bind as a typed item on `entry.pronounGaps` (default off, and then the entry is what it was). This reads
// whole documents through reading.js::readDocument twice (option off, option on) and counts what the items cover.
//
//   GUM_TRAIN=/path/to/en_gum-ud-train.conllu [GUM_DEV=/path/to/en_gum-ud-dev.conllu] node eval/referents/pronoun-gaps.mjs [--set G|B] [--json out.json]
//
// Sets: B the golden's slice B (DEVELOPMENT); G all 30 documents of the GUM dev split (CONFIRMATION, scored once). The terms are the golden's own: an ANSWERABLE
// pronoun is a gold third-person-singular personal pronoun whose gold entity has a PROPN mention the cast covers; UNBOUND when no entry.pronouns row overlaps it;
// IN-CLASS when its lower-cased form is one of he him his himself she her hers herself (the resolver's English class).
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { parseGum, slicesOf } from "./pronoun-golden.mjs";
import { readDocument } from "../../native/reading.js";
import { localLexicon } from "../../native/adapters/text/wiktionary-pack.js";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > 0;
const pct = (a, b) => (b ? `${(100 * a / b).toFixed(1)}%` : "n/a");
const CLASS = new Set(["he", "him", "his", "himself", "she", "her", "hers", "herself"]);
const REASONS = new Set(["pronoun_no_candidate", "pronoun_below_floor", "pronoun_no_margin", "pronoun_contested_no_margin", "pronoun_null_not_cleared", "frame_not_read", "no_referent_discovered"]);
export const GUM_DEV_SHA256 = "61d02ce27a143e9749118b1b9c314ac3da40f64ec17a6aaff5fc7b42704f7910";

/** The two sets. */
export function setsOf(trainFile, devFile) {
  return { B: slicesOf(parseGum(trainFile)).B, G: devFile && fs.existsSync(devFile) ? parseGum(devFile).filter((d) => d.sents.length >= 20) : null };
}

const strip = (e) => crypto.createHash("sha256").update(JSON.stringify({ ...e, ms: 0, pronounGaps: undefined })).digest("hex").slice(0, 16);

/** One document under the registration: answerable pronouns, who is bound, who has an item, the room, and the structural checks. */
async function scoreDoc(doc, lexicon) {
  const text = doc.sents.map((s) => s.text).join(" ");
  const off = await readDocument(text, { language: "en", minCharacters: 0, lexicon });
  const on = await readDocument(text, { language: "en", minCharacters: 0, lexicon, readerOptions: { pronounGaps: true } });
  const offs = []; { let p = 0; for (const s of doc.sents) { offs.push(p); p += s.text.length + 1; } }
  const ms = []; doc.sents.forEach((s, si) => s.mentions.forEach((m) => ms.push({ ent: m.ent, a: offs[si] + m.c0, b: offs[si] + m.c1, feats: m.goldHead.feats ?? "", upos: m.goldHead.upos })));
  const castSpans = []; for (const c of on.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) castSpans.push({ a, b, ref: c.ref });
  const castEnts = new Map();
  for (const c of castSpans) for (const m of ms) if (overlap(c.a, c.b, m.a, m.b)) (castEnts.get(c.ref) ?? castEnts.set(c.ref, new Set()).get(c.ref)).add(m.ent);
  const named = new Set(); for (const m of ms) if (m.upos === "PROPN" && castSpans.some((c) => overlap(c.a, c.b, m.a, m.b))) named.add(m.ent);
  const items = on.pronounGaps ?? [], bound = on.pronouns ?? [];
  const r = { answerable: 0, boundRight: 0, boundWrong: 0, unbound: 0, inClass: 0, typed: 0, room: 0, outOfClass: {}, reasons: {}, unboundNoItem: [], itemOnBound: 0, itemNotPronoun: 0, itemsMalformed: 0, items: items.length, onEqualsOff: strip(on) === strip(off), offHasField: "pronounGaps" in off, k1Typed: 0, boundTokens: bound.length };
  for (const g of items) {
    r.reasons[g.reason] = (r.reasons[g.reason] ?? 0) + 1;
    if (bound.some((p) => overlap(p.at[0], p.at[1], g.at[0], g.at[1]))) r.itemOnBound++;
    if (!CLASS.has(text.slice(g.at[0], g.at[1]).toLowerCase())) r.itemNotPronoun++;
    if (!(g.reason && g.regime && Array.isArray(g.candidates) && typeof g.detail === "string" && REASONS.has(g.reason))) r.itemsMalformed++;
  }
  for (const m of ms) {
    if (!(m.upos === "PRON" && /Person=3/.test(m.feats) && /Number=Sing/.test(m.feats) && /PronType=Prs/.test(m.feats) && named.has(m.ent))) continue;
    r.answerable++;
    const form = text.slice(m.a, m.b).toLowerCase();
    const b = bound.find((p) => overlap(p.at[0], p.at[1], m.a, m.b));
    if (b) { (castEnts.get(b.ref)?.has(m.ent) ? r.boundRight++ : r.boundWrong++); continue; }
    r.unbound++;
    if (!CLASS.has(form)) { r.outOfClass[form] = (r.outOfClass[form] ?? 0) + 1; continue; }
    r.inClass++;
    const item = items.find((g) => overlap(g.at[0], g.at[1], m.a, m.b));
    if (item) {
      r.typed++;
      if (item.candidates.some((c) => c.ref && castEnts.get(c.ref)?.has(m.ent))) r.room++;
      if (item.reason !== "frame_not_read" && item.reason !== "no_referent_discovered") r.k1Typed++;
    } else r.unboundNoItem.push({ doc: doc.id, form, at: [m.a, m.b] });
  }
  return r;
}

const add = (a, b) => { for (const [k, v] of Object.entries(b)) { if (typeof v === "number") a[k] = (a[k] ?? 0) + v; else if (Array.isArray(v)) a[k] = [...(a[k] ?? []), ...v]; else if (typeof v === "boolean") a[k] = (a[k] ?? true) && v; else if (v && typeof v === "object") { a[k] ??= {}; for (const [kk, vv] of Object.entries(v)) a[k][kk] = (a[k][kk] ?? 0) + vv; } } return a; };

/** Every bar of the registration, held / FAILED / untestable, with its number. */
export function bars(t) {
  const p1 = t.inClass < 20 ? { r: "untestable", n: `${t.typed} of ${t.inClass} typed (fewer than 20)` } : { r: t.typed === t.inClass ? "held" : "FAILED", n: `${t.typed} of ${t.inClass} unbound answerable in-class pronouns have an item = ${pct(t.typed, t.inClass)} (bar 100%)` };
  const p2 = { r: t.itemOnBound === 0 && t.itemNotPronoun === 0 ? "held" : "FAILED", n: `${t.itemOnBound} items on a bound pronoun, ${t.itemNotPronoun} items that cover no pronoun of the class` };
  const p3 = { r: t.onEqualsOff && !t.offHasField ? "held" : "FAILED", n: `option on minus pronounGaps equals option off on every document: ${t.onEqualsOff}; the field is absent when off: ${!t.offHasField} (the comparison with main's entries is the separate hash script)` };
  const p4 = { r: t.itemsMalformed === 0 ? "held" : "FAILED", n: `${t.itemsMalformed} of ${t.items} items lack reason, regime, candidates or detail, or name a reason outside the five families` };
  return { P1: p1, P2: p2, P3: p3, P4: p4 };
}

async function main() {
  const train = process.env.GUM_TRAIN || arg("--gum", null);
  const dev = process.env.GUM_DEV || arg("--dev", train ? path.join(path.dirname(train), "en_gum-ud-dev.conllu") : null);
  if (!train || !fs.existsSync(train)) { console.log("pronoun-gaps: skipped — set GUM_TRAIN to UD_English-GUM's en_gum-ud-train.conllu (CC BY-SA, not vendored)."); return; }
  const lexicon = localLexicon("en");
  await lexicon.want(["office"]);
  if (!lexicon.giver) { console.log(`pronoun-gaps: skipped — no lexicon giver on this machine (${lexicon.log.at(-1)?.gap ?? "no answer"}).`); return; }
  const setName = arg("--set", "G"), sets = setsOf(train, dev), docs = sets[setName];
  if (!docs) { console.log(`pronoun-gaps: no set ${setName} (B needs GUM_TRAIN; G needs the dev split at ${dev})`); return; }
  if (setName === "G") { const sha = crypto.createHash("sha256").update(fs.readFileSync(dev)).digest("hex"); console.log(`GUM dev sha256 ${sha}${sha === GUM_DEV_SHA256 ? " (the file PREREG-PRONOUN-GAPS.md names)" : " — NOT the file PREREG-PRONOUN-GAPS.md names"}`); }
  console.log(`set ${setName}${setName === "B" ? " (DEVELOPMENT)" : " (confirmation, scored once)"}: ${docs.length} documents`);
  const t = {};
  for (const d of docs) add(t, await scoreDoc(d, lexicon));
  const B = bars(t);
  console.log(`\nanswerable pronouns ${t.answerable}: bound right ${t.boundRight}, bound wrong ${t.boundWrong}, UNBOUND ${t.unbound} = ${pct(t.unbound, t.answerable)}; of the unbound, in the resolver's class ${t.inClass}, out of class ${t.unbound - t.inClass}`);
  for (const [k, v] of Object.entries(B)) console.log(`${k}  ${v.r.padEnd(10)} ${v.n}`);
  console.log(`\nroom (descriptive): of ${t.typed} typed unbound answerable in-class pronouns, the gold antecedent is a being among the item's candidates for ${t.room} = ${pct(t.room, t.typed)}`);
  console.log("reasons over all items:", JSON.stringify(t.reasons));
  console.log("unbound answerable OUT of class (no item, counted by form):", JSON.stringify(t.outOfClass));
  if (t.unboundNoItem.length) console.log("unbound answerable in-class pronouns with no item:", JSON.stringify(t.unboundNoItem.slice(0, 20)));
  const k1 = bars({ ...t, typed: t.k1Typed });
  console.log(`\nK1 the resolver's own gaps only (built to fail P1)      P1 ${k1.P1.r}: ${k1.P1.n}`);
  const k2 = bars({ ...t, itemOnBound: t.itemOnBound + t.boundTokens });
  console.log(`K2 an item for every pronoun, bound or not (built to fail P2)   P2 ${k2.P2.r}: ${k2.P2.n.replace(/^\d+ items on a bound pronoun/, `${t.itemOnBound + t.boundTokens} items on a bound pronoun`)}`);
  const json = arg("--json", null);
  if (json) fs.writeFileSync(json, JSON.stringify({ set: setName, ids: docs.map((d) => d.id), totals: { ...t, unboundNoItem: t.unboundNoItem }, bars: B, k1, k2 }, null, 1));
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
