// eval/referents/pronoun-presence.mjs — A PRESENCE RUNG AND A LOCALITY RUNG BESIDE THE SHIPPED PRONOUN RESOLVER, against UD_English-GUM's coreference; bars from PREREG-PRESENCE.md.
//
// The shipped resolver's "activation" is associative recall of vocabulary with no recency (see pronoun-activation/FINDINGS.md). `readerOptions.pronounPresence = { window,
// boost, feed, floor, margin, locality }` adds `entry.pronounsPresence`: the pronouns of the resolver's class bound by decayed presence over the beings of the cast, beside the
// shipped `entry.pronouns` (the plain control, untouched). This selects the dials on the development slice B by the registered grid and rule, writes them to a file, and ONLY THEN
// reads the confirmation slice E, scoring R (shipped), P, PL (P + locality), P-A (the diagnosis agent's dials) and the control K1 (mention-to-being assignment permuted).
//
//   GUM_TRAIN=/path/to/en_gum-ud-train.conllu node eval/referents/pronoun-presence.mjs --select --out dials-B.json      development: choose the dials on B
//   GUM_TRAIN=...                              node eval/referents/pronoun-presence.mjs --set E --dials dials-B.json    confirmation: refuses to run without a dials file
//
// The golden's own terms (pronoun-golden.mjs::scoreDocument): an ANSWERABLE pronoun is a gold third-person-singular personal pronoun whose entity has a PROPN mention the cast covers;
// a binding is RIGHT iff the bound being's own cast spans overlap a gold mention of that entity. Arms are scored on the same cast.
import fs from "node:fs";
import crypto from "node:crypto";
import { parseGum, slicesOf, rng, shuffled, GUM_TRAIN_SHA256 } from "./pronoun-golden.mjs";
import { setsOf } from "./cast-initial.mjs";
import { readDocument } from "../../native/reading.js";
import { localLexicon } from "../../native/adapters/text/wiktionary-pack.js";
import { resolvePronounsByPresence } from "../../native/adapters/text/pronouns.js";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(k);
const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > 0;
const pct = (a, b) => (b ? (a / b).toFixed(3) : "n/a");
export const GRID = Object.freeze({ WINDOWS: [2, 3, 4, 6, 8, 12, 24, null], BOOSTS: [1, 2, 3], FEEDS: [0, 1], FLOORS: [0, 0.2, 0.5, 1, 2, 4], MARGINS: [0, 0.1, 0.2, 0.3, 0.5, 0.7] });
export const DIAGNOSIS_DIALS = Object.freeze({ window: 4, boost: 2, feed: 1, floor: 2, margin: 0.3 });   // chosen by the diagnosis agent on slice A, not by this evaluation
const REFLEXIVE = new Set(["himself", "herself"]);
const strip = (e) => crypto.createHash("sha256").update(JSON.stringify({ ...e, ms: 0, pronounsPresence: undefined })).digest("hex").slice(0, 16);

/** The two sets: B (development) and E (confirmation). */
export const setsPresence = (docs) => ({ B: slicesOf(docs).B, E: setsOf(docs).E });

/** One document read both ways, with the golden's gold information attached. */
async function readOne(doc, lexicon, dials) {
  const text = doc.sents.map((s) => s.text).join(" ");
  const plain = await readDocument(text, { language: "en", minCharacters: 0, lexicon });
  const on = await readDocument(text, { language: "en", minCharacters: 0, lexicon, readerOptions: { pronounPresence: { ...dials, locality: false } } });
  const offs = []; { let p = 0; for (const s of doc.sents) { offs.push(p); p += s.text.length + 1; } }
  const ms = []; doc.sents.forEach((s, si) => s.mentions.forEach((m) => ms.push({ ent: m.ent, a: offs[si] + m.c0, b: offs[si] + m.c1, feats: m.goldHead.feats ?? "", upos: m.goldHead.upos })));
  const castSpans = []; for (const c of on.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) castSpans.push({ a, b, ref: c.ref });
  const castEnts = new Map();
  for (const c of castSpans) for (const m of ms) if (overlap(c.a, c.b, m.a, m.b)) (castEnts.get(c.ref) ?? castEnts.set(c.ref, new Set()).get(c.ref)).add(m.ent);
  const named = new Set(); for (const m of ms) if (m.upos === "PROPN" && castSpans.some((c) => overlap(c.a, c.b, m.a, m.b))) named.add(m.ent);
  const answerable = ms.filter((m) => m.upos === "PRON" && /Person=3/.test(m.feats) && /Number=Sing/.test(m.feats) && /PronType=Prs/.test(m.feats) && named.has(m.ent))
    .map((m) => ({ a: m.a, b: m.b, ent: m.ent, form: text.slice(m.a, m.b).toLowerCase() }));
  const mentionSentences = new Set((on.presenceInputs?.mentions ?? []).map((m) => on.presenceInputs.sentences.findIndex((s, i, arr) => m.start >= s.offset && (i === arr.length - 1 || m.start < arr[i + 1].offset))));
  return { id: doc.id, text, plain, on, answerable, castEnts, mentionSentences, inputs: on.presenceInputs, identity: strip(on) === strip(plain), offHasField: "pronounsPresence" in plain };
}

/** Score bindings [{ a, b, ref, ... }] against one document. */
export function scoreBindings(g, bindings) {
  const r = { answerable: g.answerable.length, right: 0, wrong: 0, perDoc: 0, byMech: {}, split: { reflexiveRight: 0, reflexiveWrong: 0, otherRight: 0, otherWrong: 0 }, inNamed: { right: 0, wrong: 0 }, inNameless: { right: 0, wrong: 0 }, outOfClass: 0 };
  for (const m of g.answerable) {
    const b = bindings.find((x) => overlap(x.a, x.b, m.a, m.b));
    if (!b) continue;
    const ok = !!g.castEnts.get(b.ref)?.has(m.ent);
    ok ? r.right++ : r.wrong++;
    const mech = b.mechanism ?? "shipped"; (r.byMech[mech] ??= { right: 0, wrong: 0 })[ok ? "right" : "wrong"]++;
    if (mech === "locality") r.split[(REFLEXIVE.has(m.form) ? "reflexive" : "other") + (ok ? "Right" : "Wrong")]++;
    const si = g.inputs ? g.inputs.sentences.findIndex((s, i, arr) => m.a >= s.offset && (i === arr.length - 1 || m.a < arr[i + 1].offset)) : -1;
    (g.mentionSentences.has(si) ? r.inNamed : r.inNameless)[ok ? "right" : "wrong"]++;
  }
  return r;
}
const sum = (rs) => rs.reduce((a, r) => ({ answerable: a.answerable + r.answerable, right: a.right + r.right, wrong: a.wrong + r.wrong }), { answerable: 0, right: 0, wrong: 0 });

const asBindings = (items) => items.map((b) => ({ a: b.at[0], b: b.at[1], ref: b.ref, mechanism: b.mechanism }));
const offline = (g, dials, locality = false, remap = null) => resolvePronounsByPresence(g.inputs.sentences, remap ? g.inputs.mentions.map((m, i) => ({ ...m, ref: remap[i] })) : g.inputs.mentions, { ...dials, locality, nonPersonal: g.inputs.nonPersonal })
  .bindings.map((b) => ({ a: b.offset, b: b.offset + b.pronoun.length, ref: b.referentId, mechanism: b.mechanism }));
const shipped = (g) => asBindings((g.plain.pronouns ?? []).map((p) => ({ at: p.at, ref: p.ref })));

const better = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] > b[i]) return true; if (a[i] < b[i]) return false; } return false; };

/** Choose the dials on the development slice: most RIGHT subject to precision >= the shipped resolver's on the same slice; the registered tie-breaks. */
export function selectDials(gs) {
  const R = sum(gs.map((g) => scoreBindings(g, shipped(g)))), floorPrecision = R.right / Math.max(1, R.right + R.wrong);
  let best = null, tried = 0;
  for (const window of GRID.WINDOWS) for (const boost of GRID.BOOSTS) for (const feed of GRID.FEEDS) for (const floor of GRID.FLOORS) for (const margin of GRID.MARGINS) {
    const dials = { window, boost, feed, floor, margin }; tried++;
    const t = sum(gs.map((g) => scoreBindings(g, offline(g, dials))));
    if (t.right + t.wrong === 0 || t.right / (t.right + t.wrong) < floorPrecision) continue;
    const key = [t.right, -t.wrong, floor, margin, window === null ? -Infinity : -window, -boost, -feed];   // the registered order: right, fewer wrong, larger floor, larger margin, smaller window (null last), smaller boost, feed 0
    if (!best || better(key, best.key)) best = { key, dials, t };
  }
  return { dials: best?.dials ?? null, onDevelopment: best?.t ?? null, shipped: R, floorPrecision, tried };
}

/** Paired bootstrap over documents of (arm right - R right). */
function bootstrap(perDocArm, perDocR, draws = 2000, seed = 20261180) {
  const n = perDocArm.length, r = rng(seed), diffs = [];
  for (let d = 0; d < draws; d++) { let s = 0; for (let i = 0; i < n; i++) { const j = Math.floor(r() * n); s += perDocArm[j] - perDocR[j]; } diffs.push(s); }
  diffs.sort((a, b) => a - b);
  return { lo: diffs[Math.floor(0.025 * draws)], hi: diffs[Math.floor(0.975 * draws)] };
}

async function main() {
  const file = process.env.GUM_TRAIN || arg("--gum", null);
  if (!file || !fs.existsSync(file)) { console.log("pronoun-presence: skipped — set GUM_TRAIN to UD_English-GUM's en_gum-ud-train.conllu (CC BY-SA, not vendored)."); return; }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  console.log(`GUM train sha256 ${sha}${sha === GUM_TRAIN_SHA256 ? " (the file the README's numbers were measured on)" : " — NOT the file the README's numbers were measured on"}`);
  const lexicon = localLexicon("en");
  await lexicon.want(["office"]);
  if (!lexicon.giver) { console.log(`pronoun-presence: skipped — no lexicon giver on this machine (${lexicon.log.at(-1)?.gap ?? "no answer"}).`); return; }
  const sets = setsPresence(parseGum(file));

  if (flag("--select")) {
    console.log(`set B (DEVELOPMENT): ${sets.B.length} documents; selecting the dials by the registered grid (1,728) and rule`);
    const gs = []; for (const d of sets.B) gs.push(await readOne(d, lexicon, DIAGNOSIS_DIALS));
    const sel = selectDials(gs);
    console.log(`shipped resolver on B: ${sel.shipped.right} right / ${sel.shipped.wrong} wrong of ${sel.shipped.answerable} answerable; its precision ${sel.floorPrecision.toFixed(3)} is the floor`);
    console.log(`chosen dials: ${JSON.stringify(sel.dials)}  (tried ${sel.tried}); on B: ${JSON.stringify(sel.onDevelopment)}`);
    const pa = sum(gs.map((g) => scoreBindings(g, offline(g, DIAGNOSIS_DIALS)))), pl = sum(gs.map((g) => scoreBindings(g, offline(g, sel.dials ?? DIAGNOSIS_DIALS, true))));
    console.log(`for reference on B: the diagnosis dials ${pa.right}/${pa.wrong}; the chosen dials with locality ${pl.right}/${pl.wrong}`);
    if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ dials: sel.dials, selectedOn: "B", rule: "max right s.t. precision >= shipped precision on B", shippedOnB: sel.shipped, onB: sel.onDevelopment, at: new Date().toISOString() }, null, 1));
    return;
  }

  const dialsFile = arg("--dials", null);
  if (!dialsFile || !fs.existsSync(dialsFile)) { console.log("pronoun-presence: the confirmation slice is read only with a dials file chosen on B (--select --out): refusing to run."); return; }
  const chosen = JSON.parse(fs.readFileSync(dialsFile, "utf8")).dials;
  const docs = sets[arg("--set", "E")];
  console.log(`set ${arg("--set", "E")} (confirmation, scored once): ${docs.length} documents; dials ${JSON.stringify(chosen)} (chosen on B)`);
  const gs = []; for (const d of docs) gs.push(await readOne(d, lexicon, chosen));

  // consistency: the pipeline's own field equals the pure rung re-run on the entry's inputs
  const consistent = gs.every((g) => JSON.stringify(asBindings(g.on.pronounsPresence).map((b) => [b.a, b.ref])) === JSON.stringify(offline(g, chosen).map((b) => [b.a, b.ref])));
  const rngK = rng(20261190);
  const arms = {
    R: (g) => shipped(g),
    P: (g) => asBindings(g.on.pronounsPresence),
    PL: (g) => offline(g, chosen, true),
    "P-A": (g) => offline(g, DIAGNOSIS_DIALS),
    K1: (g) => { const refs = g.inputs.mentions.map((m) => m.ref); const o = shuffled(refs.length, rngK); return offline(g, chosen, false, o.map((i) => refs[i])); },
  };
  const per = {}, tot = {};
  for (const [name, f] of Object.entries(arms)) { per[name] = gs.map((g) => scoreBindings(g, f(g))); tot[name] = sum(per[name]); }
  const A = tot.R.answerable;
  console.log(`\nanswerable pronouns ${A}   (arm: right / wrong / unbound; coverage, precision)`);
  for (const [name, t] of Object.entries(tot)) console.log(`  ${name.padEnd(4)} ${String(t.right).padStart(4)} / ${String(t.wrong).padStart(3)} / ${String(A - t.right - t.wrong).padStart(4)}   coverage ${pct(t.right + t.wrong, A)}  precision ${pct(t.right, t.right + t.wrong)}`);
  const prec = (t) => (t.right + t.wrong ? t.right / (t.right + t.wrong) : null);
  const gain = (n) => bootstrap(per[n].map((r) => r.right), per.R.map((r) => r.right));
  const bar = (r, n) => `${r.padEnd(10)} ${n}`;
  const q1 = gain("P"), q1a = gain("P-A");
  console.log("\nQ1  " + bar(q1.lo > 0 ? "held" : "FAILED", `P right - R right = ${tot.P.right - tot.R.right}, paired bootstrap 95% [${q1.lo}, ${q1.hi}] (lower bound must be above 0)`));
  const rBound = tot.R.right + tot.R.wrong;
  console.log("Q2  " + (rBound < 5 ? bar("untestable", `R binds ${rBound} (< 5)`) : bar(prec(tot.P) >= prec(tot.R) ? "held" : "FAILED", `P precision ${prec(tot.P)?.toFixed(3)} vs R ${prec(tot.R)?.toFixed(3)}`)));
  const loc = sum(per.PL.map((r) => ({ answerable: 0, right: r.byMech.locality?.right ?? 0, wrong: r.byMech.locality?.wrong ?? 0 }))), nLoc = loc.right + loc.wrong;
  console.log("Q3  " + (nLoc < 10 ? bar("untestable", `${nLoc} bindings by locality (< 10)`) : bar(loc.right / nLoc >= prec(tot.P) && tot.PL.right >= tot.P.right ? "held" : "FAILED", `locality's own precision ${(loc.right / nLoc).toFixed(3)} (${loc.right}/${loc.wrong}) vs P ${prec(tot.P)?.toFixed(3)}; PL right ${tot.PL.right} vs P right ${tot.P.right}`)));
  console.log("Q4  " + bar(gs.every((g) => g.identity) && gs.every((g) => !g.offHasField) && consistent ? "held" : "FAILED", `(b) option on minus the field equals option off on ${gs.filter((g) => g.identity).length} of ${gs.length}; the field is absent when off: ${gs.every((g) => !g.offHasField)}; the pipeline's field equals the pure rung re-run: ${consistent}. (a), the comparison with main's entries, is the separate hash script`));
  console.log("Q5  " + bar(q1a.lo > 0 && prec(tot["P-A"]) >= prec(tot.R) ? "held" : "FAILED", `P-A right - R right = ${tot["P-A"].right - tot.R.right}, bootstrap [${q1a.lo}, ${q1a.hi}]; precision ${prec(tot["P-A"])?.toFixed(3)} vs R ${prec(tot.R)?.toFixed(3)}`));
  const k1 = gain("K1"), k1held = k1.lo > 0 && prec(tot.K1) >= prec(tot.R);
  console.log(`K1  (built to fail Q1 or Q2)  ${k1held ? "HELD both: the bars cannot tell a resolver from noise" : "failed as built"}: right - R right ${tot.K1.right - tot.R.right}, bootstrap [${k1.lo}, ${k1.hi}], precision ${prec(tot.K1)?.toFixed(3)}`);
  const agg = (name, key) => per[name].reduce((a, r) => ({ right: a.right + r[key].right, wrong: a.wrong + r[key].wrong }), { right: 0, wrong: 0 });
  console.log(`\ndescriptive: P in a sentence that carries a cast mention ${JSON.stringify(agg("P", "inNamed"))}, in a nameless sentence ${JSON.stringify(agg("P", "inNameless"))}`);
  console.log(`locality bindings by pronoun: reflexive ${per.PL.reduce((a, r) => a + r.split.reflexiveRight, 0)} right / ${per.PL.reduce((a, r) => a + r.split.reflexiveWrong, 0)} wrong; non-reflexive ${per.PL.reduce((a, r) => a + r.split.otherRight, 0)} right / ${per.PL.reduce((a, r) => a + r.split.otherWrong, 0)} wrong`);
  const out = gs.reduce((a, g) => { for (const m of g.answerable) if (!["he", "him", "his", "himself", "she", "her", "hers", "herself"].includes(m.form)) a[m.form] = (a[m.form] ?? 0) + 1; return a; }, {});
  console.log("answerable OUT of class (never scanned by either rung):", JSON.stringify(out));
  const json = arg("--json", null);
  if (json) fs.writeFileSync(json, JSON.stringify({ dials: chosen, totals: tot, bootstrap: { P: q1, "P-A": q1a, K1: k1 }, consistent, ids: docs.map((d) => d.id) }, null, 1));
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
