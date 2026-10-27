// eval/meaning/identity-by-difference.mjs — IDENTITY AS THE DIFFERENCE A BEING MAKES TO THE READER (the operator, 2026-10-26: identity "more tied to the difference it made TO THE READER").
// The core mechanism's one act, at F1: rebuild the ground with one being deleted and read the difference. A being's SIGNATURE is the set of the reader's conclusions that change when its
// atoms are removed: which claim atoms lose their bind or proof (`bind:<claim atom>`), which gaps appear or vanish (`gap:<kind>`), whether the verdict moves (`verdict:<from>><to>`). The
// vocabulary is the READER's (claim atoms, gap kinds, verdicts), so a claim end and a source being can cancel without sharing a word: they are the same if deleting either disturbs the
// same conclusions. Compared with the company signature (arrangement-features.js) on the same ends, same kernel (identity-cancel.js), same gold (the stage's own unambiguous name bind).
//   IDENTITY=cancel FOLD_WIKT_SLIM=<dir> node eval/meaning/identity-by-difference.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const GE = await import(path.join(K, "native/adapters/text/grammar-en.js"));
const { readAtoms } = await import(path.join(K, "native/organs/read-atoms.js"));
const { atomSupport } = await import(path.join(K, "native/kernel/atom-support.js"));
const { stageFromAtoms, judgeClaim } = await import(path.join(K, "native/kernel/stage.js"));
const { cancelIdentity } = await import(path.join(K, "native/kernel/identity-cancel.js"));
const { makeCanon, featuresOf } = await import(path.join(K, "native/the-fold/arrangement-features.js"));
const SLIM = process.env.FOLD_WIKT_SLIM ? (await import(path.join(K, "native/organs/wikt-slim.js"))).openSlim(process.env.FOLD_WIKT_SLIM) : null;
const same = SLIM ? (await import(path.join(K, "native/organs/wikt-gloss.js"))).makeSynonymy({ lookup: (l, w) => SLIM.entries(l, w) }) : null;
const grammar = { rowsOf: GE.rowsOf, claimsOf: (t, rows) => GE.claimsOf(t, rows) }, corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const read = (t) => readAtoms({ text: t, lang: "en", grammar, corefModel });
const judge = (A, B) => { const st = stageFromAtoms(B, { doc: "src" }), j = judgeClaim(st, A); return { verdict: j.verdict, gaps: j.gaps.map((g) => g.kind).sort(), bound: j.proofs.map((p) => `${p.atom}>${p.verdict}`).sort(), proofs: j.proofs }; };
const entsOf = (atoms) => [...new Set(atoms.flatMap((a) => (a.args ?? []).filter((x) => x.entity != null).map((x) => x.entity)))];
const without = (atoms, id) => atoms.filter((a) => !(a.args ?? []).some((x) => x.entity === id));
// the signature: what the reader concluded differently once the being was gone
const signature = (j0, j1) => { const S = new Set(); for (const b of j0.bound) if (!j1.bound.includes(b)) S.add(`bind:${b}`); for (const b of j1.bound) if (!j0.bound.includes(b)) S.add(`bind+:${b}`); const g0 = new Map(), g1 = new Map(); for (const g of j0.gaps) g0.set(g, (g0.get(g) ?? 0) + 1); for (const g of j1.gaps) g1.set(g, (g1.get(g) ?? 0) + 1); for (const k of new Set([...g0.keys(), ...g1.keys()])) if ((g0.get(k) ?? 0) !== (g1.get(k) ?? 0)) S.add(`gap:${k}`); if (j0.verdict !== j1.verdict) S.add(`verdict:${j0.verdict}>${j1.verdict}`); return [...S]; };
const T = { pairs: 0, ends: 0, endsWithGold: 0, inert: { claimEnd: 0, sourceBeing: 0 }, company: { same: 0, right: 0, undecided: 0, goldInTied: 0, refused: 0 }, difference: { same: 0, right: 0, undecided: 0, goldInTied: 0, refused: 0 }, agree: 0, disagree: 0 };
for (const s of ["fresh", "heldout", "relations", "fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) {
    if ((p.lang ?? "en") !== "en") continue;
    const A = read(p.claim), B = read(p.sentence); if (atomSupport(A.atoms, B.atoms, { unread: A.unread }).verdict !== "N") continue; T.pairs++;
    const j0 = judge(A.atoms, B.atoms);
    // gold: the stage's own unambiguous name bind of a claim end to one source anchor (proof binds name the anchor label; map by the anchor's entity through the stage)
    const st = stageFromAtoms(B.atoms, { doc: "src" }), labelOf = new Map([...st._anchors.values()].filter((a) => a.arg?.entity != null).map((a) => [a.label, a.arg.entity]));
    const sigSrc = new Map(); for (const y of entsOf(B.atoms)) sigSrc.set(y, signature(j0, judge(A.atoms, without(B.atoms, y))));
    const canon = makeCanon(same, { lang: "en" }).registerAtoms(B.atoms).registerAtoms(A.atoms);
    for (const x of entsOf(A.atoms)) {
      T.ends++;
      const sigX = signature(j0, judge(without(A.atoms, x), B.atoms));
      // gold = the one source entity that shares the claim end's name token (the page experiments' gold); unambiguous only. The stage's own bind is not used, so the test is independent of it.
      const nameTok = (name) => { const t = String(name ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2); return t.length ? t.at(-1) : ""; };
      const xName = nameTok(A.atoms.flatMap((a) => a.args).find((z) => z.entity === x)?.name); if (!xName) continue;
      const srcNames = new Map(); for (const a of B.atoms) for (const z of a.args ?? []) if (z.entity != null && nameTok(z.name)) (srcNames.get(z.entity) ?? srcNames.set(z.entity, new Set()).get(z.entity)).add(nameTok(z.name));
      const golds = [...srcNames].filter(([, ts]) => ts.has(xName)).map(([id]) => id);
      if (golds.length !== 1) continue; const gold = golds[0]; T.endsWithGold++;
      if (!sigX.length) T.inert.claimEnd++;
      const candsD = [...sigSrc].map(([id, f]) => ({ id, feats: f })).filter((c) => c.feats.length); T.inert.sourceBeing += [...sigSrc.values()].filter((f) => !f.length).length / Math.max(1, entsOf(A.atoms).length);
      const rD = cancelIdentity({ mention: sigX, candidates: candsD }); T.difference[rD.verdict]++; if (rD.verdict === "same" && rD.id === gold) T.difference.right++; if (rD.verdict === "undecided" && rD.tied.includes(gold)) T.difference.goldInTied++;
      const candsC = entsOf(B.atoms).map((id) => ({ id, feats: featuresOf(B.atoms, id, { canon, lang: "en" }) })).filter((c) => c.feats.length);
      const rC = cancelIdentity({ mention: featuresOf(A.atoms, x, { canon, lang: "en" }), candidates: candsC, dropUniversal: true }); T.company[rC.verdict]++; if (rC.verdict === "same" && rC.id === gold) T.company.right++; if (rC.verdict === "undecided" && rC.tied.includes(gold)) T.company.goldInTied++;
      if (rD.verdict === "same" && rC.verdict === "same") { if (rD.id === rC.id) T.agree++; else T.disagree++; }
    }
  }
}
T.inert.sourceBeing = Math.round(T.inert.sourceBeing);
console.log(JSON.stringify(T, null, 1));
