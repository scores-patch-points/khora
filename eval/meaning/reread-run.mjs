// eval/meaning/reread-run.mjs — RE-ENTRY measured: the stage's gaps sent back down as a more careful reading (the-fold/reread.js), on the 108 English pairs.
// Arms: ONE-WAY (the pipeline as it runs); DIRECTED (re-read only the side a gap names, at tier k-best; stop when a pass changes nothing); BLANKET (re-read every pair's both sides at
// k-best, gaps or not: if this does the same, direction does no work); RANDOM (re-read a side chosen by a seeded coin, not by the gap). The delta of every pass is appended to
// eval/meaning/rec/reread.jsonl (the record of the more careful reading). The independent proof checker gates every C as in stage-run.mjs.
//   IDENTITY=cancel FOLD_WIKT_SLIM=<dir> node eval/meaning/reread-run.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const GE = await import(path.join(K, "native/adapters/text/grammar-en.js"));
const { readAtoms } = await import(path.join(K, "native/organs/read-atoms.js"));
const { atomSupport } = await import(path.join(K, "native/kernel/atom-support.js"));
const { checkProof } = await import(path.join(K, "native/kernel/proof-check.js"));
const { stageFromAtoms, judgeClaim, LICENSES } = await import(path.join(K, "native/kernel/stage.js"));
const { rereadAtoms, recurse } = await import(path.join(K, "native/the-fold/reread.js"));
const IDN = process.env.IDENTITY === "cancel" ? await import(path.join(K, "native/the-fold/cancel-identity.js")) : null;
const SLIM = IDN && process.env.FOLD_WIKT_SLIM ? (await import(path.join(K, "native/organs/wikt-slim.js"))).openSlim(process.env.FOLD_WIKT_SLIM) : null;
const SAME = SLIM ? (await import(path.join(K, "native/organs/wikt-gloss.js"))).makeSynonymy({ lookup: (l, w) => SLIM.entries(l, w) }) : null;
const grammar = { rowsOf: GE.rowsOf, rowsOfK: GE.rowsOfK, claimsOf: (t, rows) => GE.claimsOf(t, rows) };
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const GIVERS = LICENSES.map((l) => l.giver);
const read = (text) => ({ ...readAtoms({ text, lang: "en", grammar, corefModel }), text });
const judge = (A, B) => {
  const r = atomSupport(A.atoms, B.atoms, { unread: A.unread }).verdict; if (r !== "N") return { verdict: r, gaps: [], by: "rules" };
  const st = stageFromAtoms(B.atoms, { doc: "src" }), j = judgeClaim(st, A.atoms, { ...(IDN ? { identity: IDN.makeCancelIdentity({ claimAtoms: A.atoms, sourceAtoms: B.atoms, same: SAME, lang: "en" }) } : {}) });
  if (j.verdict === "C" && j.proofs.filter((x) => x.verdict === "contradicted" && !checkProof(x.record, B.text, { licenses: GIVERS }).ok).length) return { verdict: "N", gaps: j.gaps, by: "checker-refused" };
  return { verdict: j.verdict, gaps: j.gaps, by: "stage" };
};
const { readDocument, rowsOfFor } = await import(path.join(K, "native/reading.js"));
const { atomsOfPage } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const PR = await rowsOfFor("eng");
const pageOf = new Map(); for (const s of ["fresh19", "fresh20"]) for (const pg of JSON.parse(fs.readFileSync(path.join(HERE, `${s}.sources.json`), "utf8")).pages ?? []) pageOf.set(pg.url, pg);
const pageAtoms = new Map();   // url -> atomsOfPage result (the page read ONCE by the master reader, resolved once)
const onPage = async (url) => { if (!pageAtoms.has(url)) { const pg = pageOf.get(url); pageAtoms.set(url, pg ? atomsOfPage(await readDocument(pg.text, { language: "en", lexicon: false, rows: true }), { claimsOf: PR.claimsOf, corefModel, lang: "en" }) : null); } return pageAtoms.get(url); };
// the tiers this runner can read: k-best (the source under its beam, beside the production parse) and page (the source sentence as the master reader read it IN ITS PAGE: coreference over the
// whole page, one entity id per being); lexicon is not available here (no door) and is a typed stop in recurse
const rereadSide = (side, R, tier, gaps, p) => {
  if (tier === "k-best") return { ...R, ...rereadAtoms({ text: R.text, lang: "en", grammar, corefModel, k: 3, trigger: gaps.map((g) => g.kind) }), text: R.text };
  if (tier === "page") { const page = R.pageWorld; if (!page) return { ...R, rec: { tier, trigger: gaps.map((g) => g.kind), gap: "no_page", added: [], removed: [] } };
    const head = R.text.slice(0, 40), sent = page.sentences.find((x) => x.text.startsWith(head) || x.text.includes(head)); if (!sent) return { ...R, rec: { tier, trigger: gaps.map((g) => g.kind), gap: "sentence_not_in_page", added: [], removed: [] } };
    const had = new Set(R.atoms.map((a) => a.text)); return { ...R, atoms: sent.atoms, unread: R.unread, rec: { tier, trigger: gaps.map((g) => g.kind), added: sent.atoms.filter((a) => !had.has(a.text)).map((a) => a.text), removed: R.atoms.filter((a) => !sent.atoms.some((b) => b.text === a.text)).map((a) => a.text) } }; }
  return { ...R, rec: { tier, trigger: gaps.map((g) => g.kind), gap: "tier_unavailable", added: [], removed: [] } };
};
const pairs = [];
for (const s of ["fresh", "heldout", "relations", "fresh19", "fresh20"]) { const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8")); for (const p of d.pairs ?? d) if ((p.lang ?? "en") === "en") pairs.push({ ...p, set: s }); }
fs.mkdirSync(path.join(HERE, "rec"), { recursive: true }); const recPath = path.join(HERE, "rec", "reread.jsonl"); fs.writeFileSync(recPath, "");
const tally = () => ({ C: 0, falseC: 0, E: 0, falseE: 0, N: 0, passes: 0, gapsClosed: 0, moved: 0, movedRight: 0, movedWrong: 0, atomsAdded: 0 });
const arms = { oneWay: tally(), directed: tally(), blanket: tally(), random: tally() };
const score = (T, p, v, before) => { T[v === "C" ? "C" : v === "E" ? "E" : "N"]++; if (v === "C" && p.label !== "C") T.falseC++; if (v === "E" && p.label !== "E") T.falseE++; if (before != null && v !== before) { T.moved++; if (v === p.label) T.movedRight++; else if (v !== "N") T.movedWrong++; } };
let seed = 11; const coin = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) < 0.5;
for (const p of pairs) {
  const A = read(p.claim), B = { ...read(p.sentence), pageWorld: p.source?.url ? await onPage(p.source.url) : null }, j0 = judge(A, B);
  score(arms.oneWay, p, j0.verdict, null);
  // DIRECTED
  const r = recurse({ A, B, judge, reread: (side, R, tier, gaps) => rereadSide(side, R, tier, gaps, p), tiers: ["k-best", "page"], maxPasses: 3 });
  score(arms.directed, p, r.j.verdict, j0.verdict); arms.directed.passes += r.passes.length;
  for (const ps of r.passes) { arms.directed.gapsClosed += Math.max(0, ps.gapsBefore.length - ps.gapsAfter.length); arms.directed.atomsAdded += ps.delta.atomsAdded.length; fs.appendFileSync(recPath, JSON.stringify({ schema: "RereadRec@1", pair: `${p.set}:${p.id}`, label: p.label, ...ps, stopped: r.stopped, at: new Date().toISOString() }) + "\n"); }
  // BLANKET: both sides at k-best regardless
  // BLANKET: the source at k-best AND on its page where there is one, gaps or not
  const Bk = rereadSide("source", B, "k-best", []), Bb = B.pageWorld ? rereadSide("source", { ...Bk }, "page", []) : Bk, jb = judge(A, Bb); score(arms.blanket, p, jb.verdict, j0.verdict); arms.blanket.atomsAdded += (Bk.rec.added.length + (Bb.rec?.added?.length ?? 0));
  // RANDOM: the same remedies applied to a coin's choice of pairs (about half), not where a gap is
  if (coin()) { const jr = judge(A, Bb); score(arms.random, p, jr.verdict, j0.verdict); } else score(arms.random, p, j0.verdict, j0.verdict);
}
const h = crypto.createHash("sha256").update(fs.readFileSync(recPath)).digest("hex").slice(0, 12);
console.log(JSON.stringify({ pairs: pairs.length, labels: { C: pairs.filter((p) => p.label === "C").length, E: pairs.filter((p) => p.label === "E").length }, identity: IDN ? "cancel" : "none", arms, rec: { path: "eval/meaning/rec/reread.jsonl", lines: fs.readFileSync(recPath, "utf8").split("\n").filter(Boolean).length, sha256: h } }, null, 1));
