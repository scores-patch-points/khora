// eval/meaning/identity-run.mjs — does identity through the master reader's WORLD say anything the sentence-sized world cannot?
// Stage@1's binder takes an injected `identity` (adapters/text/atom-world.js::atomIdentity, the holographic test over a world of readings; kernel/stage.js bindEnd). Its world
// has been a claim and one source sentence, and the stage README records that such a world gives no "same" (too little structure). Here the source's whole PAGE is read by THE
// reader (reading.js readDocument rows:true), resolved ONCE (weft-atoms.js::atomsOfPage: one entity id means one being across the page), and the world is the page's atoms plus
// the claim's. Same pairs, same stage, same verdicts (identity annotates, it convicts only on a declared exclusion, and none is declared): what is measured is the STANDING each
// committed verdict rests on, sentence-world against page-world.   node eval/meaning/identity-run.mjs     (run from the workspace root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const { readDocument, rowsOfFor } = await import(path.join(K, "native/reading.js"));
const { atomsOfPage } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const { stageFromAtoms, judgeClaim } = await import(path.join(K, "native/kernel/stage.js"));
const { atomSupport } = await import(path.join(K, "native/kernel/atom-support.js"));
const { atomIdentity } = await import(path.join(K, "native/adapters/text/atom-world.js"));
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const P = await rowsOfFor("eng");
const opts = { claimsOf: P.claimsOf, corefModel, lang: "en" };
const pageOf = new Map(); for (const s of ["fresh19", "fresh20"]) { const f = path.join(HERE, `${s}.sources.json`); if (fs.existsSync(f)) for (const pg of JSON.parse(fs.readFileSync(f, "utf8")).pages ?? []) pageOf.set(pg.url, pg); }
const idOf = (readings) => { const w = atomIdentity(readings); return { standing: (end, anchor) => w.standing("claim", end, "src", anchor), need: w.need }; };
const T = { pairs: 0, noPage: 0, noSentence: 0, verdictMoved: 0, committed: 0, sentenceWorld: {}, pageWorld: {}, reach: { sentence: {}, page: {} }, pageSentences: [], falseE: [] };
const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1; };
for (const s of ["fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) {
    if ((p.lang ?? "en") !== "en") continue; T.pairs++;
    const pg = pageOf.get(p.source?.url); if (!pg) { T.noPage++; continue; }
    const W = await readDocument(pg.text, { language: "en", lexicon: false, rows: true }), page = atomsOfPage(W, opts);
    const head = p.sentence.slice(0, 40), si = page.sentences.findIndex((x) => x.text.startsWith(head) || x.text.includes(head));
    if (si < 0) { T.noSentence++; continue; }
    const srcAtoms = page.sentences[si].atoms, C = atomsOfPage(await readDocument(p.claim, { language: "en", lexicon: false, minCharacters: 0, rows: true }), opts);
    if (atomSupport(C.atoms, srcAtoms, { unread: [] }).verdict !== "N") continue;   // the license layer judges what the atoms arm left open (stage-run.mjs arm)
    const stage = stageFromAtoms(srcAtoms, { doc: "src" });
    const plain = judgeClaim(stage, C.atoms);
    const jS = judgeClaim(stage, C.atoms, { identity: idOf([{ doc: "src", atoms: srcAtoms }, { doc: "claim", atoms: C.atoms }]) });
    const jP = judgeClaim(stage, C.atoms, { identity: idOf([{ doc: "src", atoms: page.atoms }, { doc: "claim", atoms: C.atoms }]) });
    if (jS.verdict !== plain.verdict || jP.verdict !== plain.verdict) T.verdictMoved++;
    if (plain.verdict === "E" || plain.verdict === "C") { T.committed++; bump(T.reach.sentence, jS.reach?.standing ?? "none"); bump(T.reach.page, jP.reach?.standing ?? "none"); if (plain.verdict === "E" && p.label !== "E") T.falseE.push({ id: p.id, claim: p.claim, page: jP.reach?.standing }); }
    for (const x of jS.standings ?? []) bump(T.sentenceWorld, x.kind); for (const x of jP.standings ?? []) bump(T.pageWorld, x.kind);
    T.pageSentences.push(page.sentences.length);
  }
}
T.medianPageSentences = T.pageSentences.sort((a, b) => a - b)[T.pageSentences.length >> 1] ?? null; delete T.pageSentences;
console.log(JSON.stringify(T, null, 1));
