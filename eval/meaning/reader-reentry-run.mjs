// eval/meaning/reader-reentry-run.mjs — THE READER'S STATE AND THE RECORD ARE ONE LOG, measured: directed re-entry (reread.js) on the 108 pairs, every pass appended to the reader's log
// (the-fold/reader-log.js), each claim end met at every cursor (reader-identity.js). Read: how the reader's verdicts (same / new / undecided) and the discrepancy finder move from the first
// reading to the last pass, with the false-flag rate; and the log itself (eval/meaning/rec/reader-log.jsonl: admissions, retractions and passes, one record).
//   IDENTITY=cancel FOLD_WIKT_SLIM=<dir> node eval/meaning/reader-reentry-run.mjs
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
const { readerOf, admitPass, logOf } = await import(path.join(K, "native/the-fold/reader-log.js"));
const { stateAt, meet, arrangementsOf } = await import(path.join(K, "native/kernel/reader-identity.js"));
const { readDocument, rowsOfFor } = await import(path.join(K, "native/reading.js"));
const { atomsOfPage } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const IDN = process.env.IDENTITY === "cancel" ? await import(path.join(K, "native/the-fold/cancel-identity.js")) : null;
const SLIM = IDN && process.env.FOLD_WIKT_SLIM ? (await import(path.join(K, "native/organs/wikt-slim.js"))).openSlim(process.env.FOLD_WIKT_SLIM) : null;
const SAME = SLIM ? (await import(path.join(K, "native/organs/wikt-gloss.js"))).makeSynonymy({ lookup: (l, w) => SLIM.entries(l, w) }) : null;
const grammar = { rowsOf: GE.rowsOf, rowsOfK: GE.rowsOfK, claimsOf: (t, rows) => GE.claimsOf(t, rows) }, corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const GIVERS = LICENSES.map((l) => l.giver), PR = await rowsOfFor("eng");
const read = (text) => ({ ...readAtoms({ text, lang: "en", grammar, corefModel }), text });
const judge = (A, B) => { const r = atomSupport(A.atoms, B.atoms, { unread: A.unread }).verdict; if (r !== "N") return { verdict: r, gaps: [] }; const st = stageFromAtoms(B.atoms, { doc: "src" }), j = judgeClaim(st, A.atoms, { ...(IDN ? { identity: IDN.makeCancelIdentity({ claimAtoms: A.atoms, sourceAtoms: B.atoms, same: SAME, lang: "en" }) } : {}) });
  if (j.verdict === "C" && j.proofs.filter((x) => x.verdict === "contradicted" && !checkProof(x.record, B.text, { licenses: GIVERS }).ok).length) return { verdict: "N", gaps: j.gaps }; return { verdict: j.verdict, gaps: j.gaps }; };
const pageOf = new Map(); for (const s of ["fresh19", "fresh20"]) for (const pg of JSON.parse(fs.readFileSync(path.join(HERE, `${s}.sources.json`), "utf8")).pages ?? []) pageOf.set(pg.url, pg);
const pageAtoms = new Map(); const onPage = async (url) => { if (!pageAtoms.has(url)) { const pg = pageOf.get(url); pageAtoms.set(url, pg ? atomsOfPage(await readDocument(pg.text, { language: "en", lexicon: false, rows: true }), { claimsOf: PR.claimsOf, corefModel, lang: "en" }) : null); } return pageAtoms.get(url); };
const rereadSide = (side, R, tier, gaps) => {
  if (tier === "k-best") return { ...R, ...rereadAtoms({ text: R.text, lang: "en", grammar, corefModel, k: 3, trigger: gaps.map((g) => g.kind) }), text: R.text };
  if (tier === "page") { const page = R.pageWorld; if (!page) return { ...R, rec: { tier, gap: "no_page", added: [], removed: [] } }; const head = R.text.slice(0, 40), sent = page.sentences.find((x) => x.text.startsWith(head) || x.text.includes(head)); if (!sent) return { ...R, rec: { tier, gap: "sentence_not_in_page", added: [], removed: [] } };
    const had = new Set(R.atoms.map((a) => a.text)); return { ...R, atoms: sent.atoms, rec: { tier, added: sent.atoms.filter((a) => !had.has(a.text)).map((a) => a.text), removed: R.atoms.filter((a) => !sent.atoms.some((b) => b.text === a.text)).map((a) => a.text) } }; }
  return { ...R, rec: { tier, gap: "tier_unavailable", added: [], removed: [] } };
};
const oneValued = (rel) => /^has_[a-z_]+@0$/.test(rel) && !/^has_(count|value|number_of_)/.test(rel);
const tok = (name) => { const t = String(name ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2); return t.length ? t.at(-1) : ""; };
const ents = (atoms) => [...new Set(atoms.flatMap((a) => (a.args ?? []).filter((x) => x.entity != null).map((x) => x.entity)))];
fs.mkdirSync(path.join(HERE, "rec"), { recursive: true }); const logPath = path.join(HERE, "rec", "reader-log.jsonl"); fs.writeFileSync(logPath, "");
const T = { pairs: 0, rereadPairs: 0, passes: 0, ends: 0, first: { same: 0, new: 0, undecided: 0, aboveNull: 0 }, last: { same: 0, new: 0, undecided: 0, aboveNull: 0 }, moved: { newToSame: 0, undecidedToSame: 0, sameToOther: 0, nullGained: 0 }, flags: { first: { pairs: 0, C: 0, notC: 0 }, last: { pairs: 0, C: 0, notC: 0 } }, logRows: 0 };
for (const s of ["fresh", "heldout", "relations", "fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) {
    if ((p.lang ?? "en") !== "en") continue; T.pairs++;
    const A = read(p.claim), B = { ...read(p.sentence), pageWorld: p.source?.url ? await onPage(p.source.url) : null };
    let reader = readerOf(B.atoms, { doc: `${s}:${p.id}` }); const cursor0 = reader.admissions.length - 1;
    const r = recurse({ A, B, judge, reread: rereadSide, tiers: ["k-best", "page"], maxPasses: 3 });
    if (r.passes.length) T.rereadPairs++; T.passes += r.passes.length;
    // replay the passes onto the reader's log: the source's atoms before and after each pass (recurse returns the final B; the passes carry the deltas by text, so re-derive the sequence)
    let cur = B; for (const ps of r.passes) { const next = ps.sides.includes("source") ? rereadSide("source", cur, ps.tier, []) : cur; reader = admitPass(reader, { before: cur.atoms, after: next.atoms, pass: ps.pass, tier: ps.tier, doc: `${s}:${p.id}` }); cur = next; }
    const first = stateAt(reader, cursor0), last = stateAt(reader);
    let flaggedFirst = false, flaggedLast = false;
    for (const x of ents(A.atoms)) { const arr = arrangementsOf(A.atoms, x); if (!arr.length) continue; T.ends++;
      const m0 = meet(first, arr, { oneValued }), m1 = meet(last, arr, { oneValued });
      for (const [S, m] of [[T.first, m0], [T.last, m1]]) { S[m.verdict] = (S[m.verdict] ?? 0) + 1; if (m.standing === "same_above_null") S.aboveNull++; }
      if (m0.verdict === "new" && m1.verdict === "same") T.moved.newToSame++; if (m0.verdict === "undecided" && m1.verdict === "same") T.moved.undecidedToSame++; if (m0.verdict === "same" && m1.verdict !== "same") T.moved.sameToOther++;
      if (m0.standing !== "same_above_null" && m1.standing === "same_above_null") T.moved.nullGained++;
      if (m0.verdict === "same" && m0.moved?.length) flaggedFirst = true; if (m1.verdict === "same" && m1.moved?.length) flaggedLast = true; }
    for (const [F, f] of [[T.flags.first, flaggedFirst], [T.flags.last, flaggedLast]]) if (f) { F.pairs++; if (p.label === "C") F.C++; else F.notC++; }
    for (const row of logOf(reader)) fs.appendFileSync(logPath, JSON.stringify({ pair: `${s}:${p.id}`, ...row }) + "\n"); for (const ps of r.passes) fs.appendFileSync(logPath, JSON.stringify({ schema: "RereadRec@1", pair: `${s}:${p.id}`, ...ps }) + "\n");
  }
}
T.logRows = fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean).length; T.logSha256 = crypto.createHash("sha256").update(fs.readFileSync(logPath)).digest("hex").slice(0, 12);
console.log(JSON.stringify(T, null, 1));
