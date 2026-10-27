// eval/referents/pronoun-golden.mjs — A GOLDEN FOR PRONOUN BINDING: the real reading pipeline against UD_English-GUM's coreference.
//
// organs/hypergraph.js said "No golden exists for pronoun binding in THIS repo". This is one. It reads whole GUM documents through the master
// pipeline (reading.js::readDocument → read-core.mjs) and scores the bindings the pipeline itself reports (`entry.pronouns`) against the gold
// coreference chains. Nothing here resolves a pronoun; it only counts what the reader did.
//
//   GUM_TRAIN=/path/to/en_gum-ud-train.conllu node eval/referents/pronoun-golden.mjs [--slice B,C,D] [--regimes] [--check]
//
//   Without the GUM file the eval says so and exits 0 (the corpus is CC BY-SA and is not vendored). The file's sha256 is printed and
//   compared with the one the numbers in eval/referents/README.md were measured on.
//
// Truth. A gold pronoun is ANSWERABLE when it is third-person singular personal (Person=3, Number=Sing, PronType=Prs on its gold head) and its
// entity has a gold proper-name mention (PROPN head) that the reader's cast covers. An answerable pronoun the reader bound is RIGHT when the
// bound being's own mention spans overlap a gold mention of the pronoun's entity, WRONG otherwise. (A being's entities come only from its
// own cast spans, never from the pronoun it is being scored on: the first harness of this family counted the pronoun's own mention and read
// 88% precision where the truth was 29%.)
//
// Arms (same lexicon, same documents, same dials; they differ in ONE thing):
//   shipped        readerOptions.nonPersonalOf = null   the production dials with no ruling of who is not a person (the call before this eval)
//   shipped + np   the default                          the same dials plus the givers' nonPersonal (adapters/text/non-personal.js)
// --regimes adds the two regimes of PREREG-LADDER-8 the resolver already carries behind declared dials, each with and without the ruling:
//   adjudicated    + contestedMargin 0.2
//   null+presence  + contestedMargin 0.2, nullTest {draws 199, seed 20261120, alpha 0.05}, window 12, activationFloor 0.5, activationMargin 0.2
//
// Slices (seeded, documents of at least 20 sentences, in id order; earlier slice A of seed 20261110 is excluded as spent):
//   B  30 documents, seed 20261120   the slice the rule was DEVELOPED on (its errors were read to find the rule): in-sample
//   C  30 documents, seed 20261130   never looked at while the rule was built: out of sample
//   D  30 documents, seed 20261141   drawn after 65 further documents were set aside for another experiment: out of sample
import fs from "node:fs";
import crypto from "node:crypto";
import { readDocument } from "../../native/reading.js";
import { resolvePronouns } from "../../native/adapters/text/pronouns.js";
import { localLexicon } from "../../native/adapters/text/wiktionary-pack.js";

export const GUM_TRAIN_SHA256 = "88c410ca6a51ccc79f9536d75feb1633421691165cd191f8137f8b37569a0329";
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(k);

/** mulberry32 */
export const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
export const shuffled = (n, r) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** GUM conllu → documents → sentences (text, tokens with char offsets) → gold mentions (entity id, span, head token). */
export function parseGum(file) {
  const docs = []; let doc = null, sent = null;
  const close = () => { if (sent && sent.tokens.length) { finish(sent); doc.sents.push(sent); } sent = null; };
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# newdoc id")) { close(); doc = { id: line.split("=")[1].trim(), sents: [] }; docs.push(doc); continue; }
    if (line.startsWith("# text = ")) { sent ??= { tokens: [], events: [], text: "" }; sent.text = line.slice(9); continue; }
    if (line.startsWith("#")) continue;
    if (!line.trim()) { close(); continue; }
    const f = line.split("\t"); if (!/^\d+$/.test(f[0])) continue;
    sent ??= { tokens: [], events: [], text: "" };
    const misc = Object.fromEntries((f[9] ?? "").split("|").filter((x) => x.includes("=")).map((x) => [x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1)]));
    sent.tokens.push({ id: +f[0], form: f[1], upos: f[3], feats: f[5], head: +f[6] }); sent.events.push(misc.Entity ?? "");
  }
  close(); return docs;
}
function finish(s) {
  let p = 0; for (const t of s.tokens) { const i = s.text.indexOf(t.form, p); if (i >= 0) { t.start = i; t.end = i + t.form.length; p = t.end; } else { t.start = p; t.end = p; } }
  const open = [], ms = [], re = /\((\d+)-([^()]*)(\))?|(\d+)\)/g;
  s.events.forEach((ev, t) => { let m; re.lastIndex = 0; while ((m = re.exec(ev))) {
    if (m[1] !== undefined) { if (m[3]) ms.push({ ent: +m[1], start: t, end: t }); else open.push({ ent: +m[1], start: t }); }
    else { const id = +m[4]; for (let i = open.length - 1; i >= 0; i--) if (open[i].ent === id) { ms.push({ ent: id, start: open[i].start, end: t }); open.splice(i, 1); break; } } } });
  s.mentions = ms.sort((a, b) => a.start - b.start || b.end - a.end).map((m) => {
    const toks = s.tokens.slice(m.start, m.end + 1), ids = new Set(toks.map((x) => x.id)), head = toks.find((x) => !ids.has(x.head)) ?? toks.at(-1);
    return { ...m, c0: toks[0].start, c1: toks.at(-1).end, goldHead: head };
  });
  delete s.events;
}

/** The three slices. */
export function slicesOf(docs) {
  const ord = docs.filter((d) => d.sents.length >= 20).sort((a, b) => (a.id < b.id ? -1 : 1));
  const Adocs = shuffled(ord.length, rng(20261110)).slice(0, 30).map((i) => ord[i]), A = new Set(Adocs.map((d) => d.id));
  const restB = ord.filter((d) => !A.has(d.id)), B = shuffled(restB.length, rng(20261120)).slice(0, 30).map((i) => restB[i]), inB = new Set(B.map((d) => d.id));
  const restC = ord.filter((d) => !A.has(d.id) && !inB.has(d.id)), C = shuffled(restC.length, rng(20261130)).slice(0, 30).map((i) => restC[i]), inC = new Set(C.map((d) => d.id));
  const unused = ord.filter((d) => !A.has(d.id) && !inB.has(d.id) && !inC.has(d.id));
  const asideDocs = shuffled(unused.length, rng(20261140)).slice(0, 65).map((i) => unused[i]), aside = new Set(asideDocs.map((d) => d.id)), left = unused.filter((d) => !aside.has(d.id));
  const D = shuffled(left.length, rng(20261141)).slice(0, 30).map((i) => left[i]);
  // A (spent by the pronoun work) and the 65 set aside by seed 20261140 are drawn here too, for the evals that need a slice no earlier work read
  return { B, C, D, A: Adocs, aside: asideDocs };
}

/** The reader's bindings on one document against the gold: { answerable, right, wrong }. */
export async function scoreDocument(doc, readOpts) {
  const text = doc.sents.map((s) => s.text).join(" ");
  const entry = await readDocument(text, { language: "en", minCharacters: 0, ...readOpts });
  const offs = []; let o = 0; for (const s of doc.sents) { offs.push(o); o += s.text.length + 1; }
  const ms = []; doc.sents.forEach((s, si) => s.mentions.forEach((m) => ms.push({ ent: m.ent, a: offs[si] + m.c0, b: offs[si] + m.c1, feats: m.goldHead.feats ?? "", upos: m.goldHead.upos })));
  const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > 0;
  const castSpans = []; for (const c of entry.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) castSpans.push({ a, b, ref: c.ref });
  const castEnts = new Map();
  for (const c of castSpans) for (const m of ms) if (overlap(c.a, c.b, m.a, m.b)) (castEnts.get(c.ref) ?? castEnts.set(c.ref, new Set()).get(c.ref)).add(m.ent);
  const named = new Set(); for (const m of ms) if (m.upos === "PROPN" && castSpans.some((c) => overlap(c.a, c.b, m.a, m.b))) named.add(m.ent);
  let answerable = 0, right = 0, wrong = 0;
  for (const m of ms) {
    if (!(m.upos === "PRON" && /Person=3/.test(m.feats) && /Number=Sing/.test(m.feats) && /PronType=Prs/.test(m.feats) && named.has(m.ent))) continue;
    answerable++;
    const b = (entry.pronouns ?? []).find((p) => overlap(p.at[0], p.at[1], m.a, m.b));
    if (!b) continue;
    (castEnts.get(b.ref)?.has(m.ent) ? right++ : wrong++);
  }
  return { answerable, right, wrong, report: entry.aliasReport?.nonPersonal ?? null };
}

const NULL_TEST = { draws: 199, seed: 20261120, alpha: 0.05 };
const REGIMES = {
  "shipped": null,
  "adjudicated": { contestedMargin: 0.2 },
  "null+presence": { contestedMargin: 0.2, nullTest: NULL_TEST, window: 12, activationFloor: 0.5, activationMargin: 0.2 },
};

/** The reader options of one arm: the dials of a regime ride the real resolver; the ruling is off for the control. */
function armOptions(dials, ruling) {
  const readerOptions = {};
  if (!ruling) readerOptions.nonPersonalOf = null;
  if (dials) readerOptions.resolvePronouns = (sentences, surfaceToReferent, base) => resolvePronouns(sentences, surfaceToReferent, { ...base, ...dials });
  return Object.keys(readerOptions).length ? { readerOptions } : {};
}

async function main() {
  const file = process.env.GUM_TRAIN || arg("--gum", null);
  if (!file || !fs.existsSync(file)) { console.log("pronoun-golden: skipped — set GUM_TRAIN to UD_English-GUM's en_gum-ud-train.conllu (CC BY-SA, not vendored)."); return; }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  console.log(`GUM train sha256 ${sha}${sha === GUM_TRAIN_SHA256 ? " (the file the README's numbers were measured on)" : " — NOT the file the README's numbers were measured on"}`);
  const lexicon = localLexicon("en");
  await lexicon.want(["office"]);
  if (!lexicon.giver) { console.log(`pronoun-golden: skipped — no lexicon giver on this machine (${lexicon.log.at(-1)?.gap ?? "no answer"}).`); return; }
  const slices = slicesOf(parseGum(file));
  const want = (arg("--slice", "B,C,D")).split(",");
  const regimes = flag("--regimes") ? Object.keys(REGIMES) : ["shipped"];
  const totals = {};
  for (const name of want) for (const regime of regimes) for (const ruling of [false, true]) {
    const arm = `${regime}${ruling ? " + np" : ""}`;
    let sum = { answerable: 0, right: 0, wrong: 0 };
    for (const d of slices[name]) { const r = await scoreDocument(d, { lexicon, ...armOptions(REGIMES[regime], ruling) }); sum = { answerable: sum.answerable + r.answerable, right: sum.right + r.right, wrong: sum.wrong + r.wrong }; }
    (totals[arm] ??= {})[name] = sum;
  }
  console.log("\narm".padEnd(24), want.map((n) => `${n} right/wrong`.padEnd(16)).join(""), "pooled right/wrong  precision  coverage of answerable");
  for (const [arm, by] of Object.entries(totals)) {
    const R = want.reduce((a, n) => a + by[n].right, 0), W = want.reduce((a, n) => a + by[n].wrong, 0), A = want.reduce((a, n) => a + by[n].answerable, 0);
    console.log(arm.padEnd(24), want.map((n) => `${by[n].right}/${by[n].wrong}`.padEnd(16)).join(""), `${R}/${W}`.padEnd(19), (R / Math.max(1, R + W)).toFixed(3).padEnd(10), `${((R + W) / Math.max(1, A) * 100).toFixed(1)}% of ${A}`);
  }
  if (flag("--check")) {
    const c = totals["shipped + np"], b = totals["shipped"], sum = (t, k) => want.reduce((a, n) => a + t[n][k], 0);
    const ok = sum(c, "wrong") < sum(b, "wrong") && sum(c, "right") >= sum(b, "right");
    console.log(ok ? "\ncheck: held — the ruling lowers wrong bindings and loses no right ones." : "\ncheck: FAILED — the ruling did not lower wrong bindings, or lost right ones.");
    if (!ok) process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
