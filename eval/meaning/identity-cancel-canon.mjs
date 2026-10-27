// eval/meaning/identity-cancel-canon.mjs — identity as cancellation on CANONICAL, perspective-typed features (the-fold/arrangement-features.js), against the plain features of
// identity-cancel-run.mjs. The pre-stated bar (the essay, section 16): company-only identification must lift well above 45% on supported claims, or the individuation instrument is not the
// bottleneck. Same 28 mentions, same page candidates, same gold; synonymy from the slim Wiktionary (FOLD_WIKT_SLIM) through makeSynonymy; no threshold anywhere.
//   FOLD_WIKT_SLIM=<dir> node eval/meaning/identity-cancel-canon.mjs   (from the workspace root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const { readDocument, rowsOfFor } = await import(path.join(K, "native/reading.js"));
const { atomsOfPage } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const { cancelIdentity, standingOf } = await import(path.join(K, "native/kernel/identity-cancel.js"));
const { makeCanon, featuresOf, PERSPECTIVE } = await import(path.join(K, "native/the-fold/arrangement-features.js"));
const { argText, low } = await import(path.join(K, "native/kernel/atom-support.js"));
const SLIM = process.env.FOLD_WIKT_SLIM ? (await import(path.join(K, "native/organs/wikt-slim.js"))).openSlim(process.env.FOLD_WIKT_SLIM) : null;
const same = SLIM ? (await import(path.join(K, "native/organs/wikt-gloss.js"))).makeSynonymy({ lookup: (l, w) => SLIM.entries(l, w) }) : null;
if (!same) console.error("no FOLD_WIKT_SLIM: synonymy off (each word its own class)");
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const P = await rowsOfFor("eng"), opts = { claimsOf: P.claimsOf, corefModel, lang: "en" };
const tok = (a) => { const t = low(argText(a)).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((x) => x.length > 2); return t.length ? t.at(-1) : ""; };
const plainFeats = (atoms, id) => { const out = []; for (const a of atoms) { if (!(a.args ?? []).some((x) => x.entity === id)) continue; out.push(`v:${a.pred}`); for (const y of a.args) if (y.entity !== id && tok(y)) out.push(`w:${tok(y)}`); } return out; };
const pageOf = new Map(); for (const s of ["fresh19", "fresh20"]) for (const pg of JSON.parse(fs.readFileSync(path.join(HERE, `${s}.sources.json`), "utf8")).pages ?? []) pageOf.set(pg.url, pg);
const ARMS = ["plain", "canon", "canon+drop", "canon+drop+persp"];
const tally = () => ({ n: 0, same: 0, sameRight: 0, undecided: 0, goldInTied: 0, refused: 0, tied: [], byLabel: {} });
const R = {}; for (const v of ["COMPANY", "NAMED"]) R[v] = Object.fromEntries(ARMS.map((a) => [a, tally()]));
const STAND = { COMPANY: { same: 0, above: 0, aboveRight: 0, belowRight: 0, belowWrong: 0 }, NAMED: { same: 0, above: 0, aboveRight: 0, belowRight: 0, belowWrong: 0 } };
let synonymClasses = 0, mergedWords = 0; const FIRED = { mentionsWithDimension: 0, candidatesWithDimension: 0, universalDrops: 0, excludedByPerspective: 0, goldSharesNothing: 0, goldSharesSomething: 0, mentionSize: [] }; const WRONG = [];
for (const s of ["fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) {
    if ((p.lang ?? "en") !== "en") continue; const pg = pageOf.get(p.source?.url); if (!pg) continue;
    const page = atomsOfPage(await readDocument(pg.text, { language: "en", lexicon: false, rows: true }), opts);
    const Cc = atomsOfPage(await readDocument(p.claim, { language: "en", lexicon: false, minCharacters: 0, rows: true }), opts);
    const canon = makeCanon(same, { lang: "en" }).registerAtoms(page.atoms).registerAtoms(Cc.atoms);
    const names = new Map(); for (const a of page.atoms) for (const x of a.args ?? []) if (x.entity != null && tok(x)) (names.get(x.entity) ?? names.set(x.entity, new Set()).get(x.entity)).add(tok(x));
    const seen = new Set();
    for (const a of Cc.atoms) for (const x of a.args ?? []) {
      if (x.entity == null || seen.has(x.entity) || !tok(x)) continue; seen.add(x.entity);
      const gold = [...names].filter(([, ts]) => ts.has(tok(x))).map(([id]) => id); if (gold.length !== 1) continue;
      for (const variant of ["COMPANY", "NAMED"]) for (const arm of ARMS) {
        const F = arm === "plain" ? (at, id) => plainFeats(at, id) : (at, id) => featuresOf(at, id, { canon, lang: "en" });
        const cands = [...names].map(([id, ts]) => ({ id, feats: [...F(page.atoms, id), ...(variant === "NAMED" ? [...ts].map((t) => `n:${t}`) : [])] })).filter((c) => c.feats.length);
        const mention = [...F(Cc.atoms, x.entity), ...(variant === "NAMED" ? [`n:${tok(x)}`] : [])];
        const r = cancelIdentity({ mention, candidates: cands, dropUniversal: /drop/.test(arm), perspective: /persp/.test(arm) ? PERSPECTIVE : [] });
        if (arm === "canon+drop+persp") { const st = standingOf({ mention, candidates: cands, dropUniversal: true, perspective: PERSPECTIVE }); const S = STAND[variant]; if (st.verdict === "same") { S.same++; if (st.standing === "same_above_null") { S.above++; if (st.id === gold[0]) S.aboveRight++; } else if (st.id === gold[0]) S.belowRight++; else S.belowWrong++; } }
        if (arm === "canon+drop+persp" && variant === "COMPANY") { if (mention.some((f) => /=/.test(f))) FIRED.mentionsWithDimension++; FIRED.candidatesWithDimension += cands.filter((c) => c.feats.some((f) => /=/.test(f))).length; FIRED.universalDrops += (r.universal ?? []).length; FIRED.excludedByPerspective += (r.excluded ?? []).length; FIRED.mentionSize.push(mention.length);
          const g = cands.find((c) => c.id === gold[0]), gs = new Set(g?.feats ?? []), shared = mention.filter((f) => gs.has(f)); if (shared.length) FIRED.goldSharesSomething++; else FIRED.goldSharesNothing++;
          if (r.verdict === "same" && r.id !== gold[0] && p.label === "E" && WRONG.length < 8) WRONG.push({ claim: p.claim.slice(0, 70), end: tok(x), mention, goldHas: [...gs].slice(0, 6), shared, source: p.sentence.slice(0, 90) }); }
        const T = R[variant][arm], lab = p.label ?? "?"; T.n++; T[r.verdict]++; const L = (T.byLabel[lab] ??= { n: 0, same: 0, sameRight: 0 }); L.n++;
        if (r.verdict === "same") { L.same++; if (r.id === gold[0]) { T.sameRight++; L.sameRight++; } }
        if (r.verdict === "undecided") { T.tied.push(r.tied.length); if (r.tied.includes(gold[0])) T.goldInTied++; }
      }
    }
    const classes = new Map(); for (const a of [...page.atoms, ...Cc.atoms]) if (a.pred !== "is_a" && a.pred !== "named") { const st = a.pred.replace(/^(more|most):/, "").split("_")[0]; (classes.get(canon(st)) ?? classes.set(canon(st), new Set()).get(canon(st))).add(st); }
    synonymClasses += [...classes.values()].filter((v) => v.size > 1).length; mergedWords += [...classes.values()].filter((v) => v.size > 1).reduce((s, v) => s + v.size, 0);
  }
}
for (const v of Object.values(R)) for (const t of Object.values(v)) { t.medianTied = t.tied.sort((a, b) => a - b)[t.tied.length >> 1] ?? null; delete t.tied; }
FIRED.medianMentionSize = FIRED.mentionSize.sort((a, b) => a - b)[FIRED.mentionSize.length >> 1]; delete FIRED.mentionSize;
console.log(JSON.stringify({ standing: STAND, fired: FIRED, wrongOnSupported: WRONG, synonymy: same ? "wiktionary-slim" : "off", synonymClassesWithMerges: synonymClasses, wordsMerged: mergedWords, arms: R }, null, 1));
