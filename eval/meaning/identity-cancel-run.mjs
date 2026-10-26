// eval/meaning/identity-cancel-run.mjs — identity as CANCELLATION within a plateau [noise, DMD) (kernel/identity-cancel.js), on the page-world mentions of resolve-run.mjs / regional-resolve.mjs.
// Same 28 scored mentions, same candidates (the page's referents), same gold (the one referent sharing the mention's name token), no stated threshold. Read at each fold radius (the mention's
// and every candidate's company widened hop by hop through the page's graph) so the DMD CUT can be seen: the window is the shallowest radius whose verdict equals the widest's (dmdWindow).
//   node eval/meaning/identity-cancel-run.mjs   (from the workspace root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const { readDocument, rowsOfFor } = await import(path.join(K, "native/reading.js"));
const { atomsOfPage } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const { cancelIdentity } = await import(path.join(K, "native/kernel/identity-cancel.js"));
const { dmdWindow } = await import(path.join(K, "native/kernel/activation.js"));
const { argText, low } = await import(path.join(K, "native/kernel/atom-support.js"));
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const P = await rowsOfFor("eng"), opts = { claimsOf: P.claimsOf, corefModel, lang: "en" };
const tok = (a) => { const t = low(argText(a)).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((x) => x.length > 2); return t.length ? t.at(-1) : ""; };
const RADII = [0, 1, 2, 3];
const pageOf = new Map(); for (const s of ["fresh19", "fresh20"]) for (const pg of JSON.parse(fs.readFileSync(path.join(HERE, `${s}.sources.json`), "utf8")).pages ?? []) pageOf.set(pg.url, pg);
const graphOf = (atoms) => { const g = new Map(), link = (a, b) => { if (a !== b) { (g.get(a) ?? g.set(a, new Set()).get(a)).add(b); (g.get(b) ?? g.set(b, new Set()).get(b)).add(a); } };
  for (const a of atoms) { const ns = [`v:${a.pred}`, ...(a.args ?? []).map((x) => tok(x) && `w:${tok(x)}`).filter(Boolean)]; for (const x of ns) for (const y of ns) link(x, y); } return g; };
const ball = (nodes, g, r) => { let cur = new Set(nodes); for (let i = 0; i < r; i++) { const nx = new Set(cur); for (const n of cur) for (const m of g.get(n) ?? []) nx.add(m); cur = nx; } return cur; };
const featuresOf = (atoms, id) => { const out = []; for (const a of atoms) { if (!(a.args ?? []).some((x) => x.entity === id)) continue; out.push(`v:${a.pred}`); for (const y of a.args) if (y.entity !== id && tok(y)) out.push(`w:${tok(y)}`); } return out; };
const tally = () => ({ n: 0, same: 0, sameRight: 0, undecided: 0, goldInTied: 0, refused: 0, noGoldAmongLive: 0, widths: [] });
const R = { COMPANY: Object.fromEntries(RADII.map((r) => [r, tally()])), NAMED: Object.fromEntries(RADII.map((r) => [r, tally()])) };
const L0 = { COMPANY: {}, NAMED: {} }, TIED = { COMPANY: [], NAMED: [] };
const SEL = { COMPANY: { n: 0, same: 0, sameRight: 0, undecided: 0, goldInTied: 0, radii: {} }, NAMED: { n: 0, same: 0, sameRight: 0, undecided: 0, goldInTied: 0, radii: {} } };
const WRONG = [];
const W = { COMPANY: { windows: {}, windowRight: 0, windowSame: 0, n: 0 }, NAMED: { windows: {}, windowRight: 0, windowSame: 0, n: 0 } };
for (const s of ["fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) {
    if ((p.lang ?? "en") !== "en") continue; const pg = pageOf.get(p.source?.url); if (!pg) continue;
    const page = atomsOfPage(await readDocument(pg.text, { language: "en", lexicon: false, rows: true }), opts), g = graphOf(page.atoms);
    const Cc = atomsOfPage(await readDocument(p.claim, { language: "en", lexicon: false, minCharacters: 0, rows: true }), opts);
    const names = new Map(); for (const a of page.atoms) for (const x of a.args ?? []) if (x.entity != null && tok(x)) (names.get(x.entity) ?? names.set(x.entity, new Set()).get(x.entity)).add(tok(x));
    const seen = new Set();
    for (const a of Cc.atoms) for (const x of a.args ?? []) {
      if (x.entity == null || seen.has(x.entity) || !tok(x)) continue; seen.add(x.entity);
      const gold = [...names].filter(([, ts]) => ts.has(tok(x))).map(([id]) => id); if (gold.length !== 1) continue;
      for (const variant of ["COMPANY", "NAMED"]) {
        const cands0 = [...names].map(([id, ts]) => ({ id, nodes: [...featuresOf(page.atoms, id), ...(variant === "NAMED" ? [...ts].map((t) => `n:${t}`) : [])] })).filter((c) => c.nodes.length);
        const mine = [...featuresOf(Cc.atoms, x.entity), ...(variant === "NAMED" ? [`n:${tok(x)}`] : [])];
        const per = RADII.map((r) => { const mb = [...ball(mine, g, r)], res = cancelIdentity({ mention: mb, candidates: cands0.map((c) => ({ id: c.id, feats: [...ball(c.nodes, g, r)] })) }); return { r, res }; });
        for (const { r, res } of per) { const T = R[variant][r]; T.n++; T[res.verdict]++; if (res.verdict === "same" && res.id === gold[0]) T.sameRight++; if (res.verdict === "undecided" && res.tied.includes(gold[0])) T.goldInTied++; if (res.margin?.width != null) T.widths.push(res.margin.width); }
        { const r0 = per[0].res, lab = p.label ?? "?", T0 = (L0[variant][lab] ??= { n: 0, same: 0, sameRight: 0, undecided: 0, goldInTied: 0 }); T0.n++; T0[r0.verdict] = (T0[r0.verdict] ?? 0) + 1;
          if (r0.verdict === "same" && r0.id === gold[0]) T0.sameRight++; if (r0.verdict === "undecided") { TIED[variant].push(r0.tied.length); if (r0.tied.includes(gold[0])) T0.goldInTied++; } }
        { // ONE rule, stated before it was run: the shallowest radius at which the number of candidates tied at the best residual is smallest (widening stops ADDING discrimination)
          const tieOf = (e) => (e.res.verdict === "same" ? 1 : e.res.verdict === "undecided" ? e.res.tied.length : Infinity);
          const pick = per.reduce((b, e) => (tieOf(e) < tieOf(b) ? e : b), per[0]), S = SEL[variant]; S.n++; S[pick.res.verdict] = (S[pick.res.verdict] ?? 0) + 1; S.radii[pick.r] = (S.radii[pick.r] ?? 0) + 1;
          if (pick.res.verdict === "same" && pick.res.id === gold[0]) S.sameRight++; if (pick.res.verdict === "undecided" && pick.res.tied.includes(gold[0])) S.goldInTied++; }
        { const r0 = per[0].res; if (variant === "COMPANY" && p.label === "E" && r0.verdict === "same" && r0.id !== gold[0]) { const goldC = cands0.find((c) => c.id === gold[0]), has = new Set(goldC?.nodes ?? []), winC = cands0.find((c) => c.id === r0.id);
          WRONG.push({ claim: p.claim.slice(0, 80), end: tok(x), mention: mine, goldMissing: mine.filter((f) => !has.has(f)), goldKeeps: [...has].slice(0, 8), winnerNames: [...(names.get(r0.id) ?? [])].slice(0, 3), winnerResidual: r0.residuals[0].residual, goldResidual: r0.residuals.find((q) => q.id === gold[0])?.residual }); } }
        const key = (e) => `${e.res.verdict}:${e.res.id ?? (e.res.tied ?? []).join("+")}`;
        const w = dmdWindow(per, (obs) => key(obs.at(-1)), { candidates: RADII.map((r) => r + 1), restrict: (o, dd) => o.slice(0, dd) });
        const WW = W[variant]; WW.n++; const at = w.window != null ? per[w.window - 1] : null; WW.windows[at ? at.r : "none"] = (WW.windows[at ? at.r : "none"] ?? 0) + 1;
        if (at?.res.verdict === "same") { WW.windowSame++; if (at.res.id === gold[0]) WW.windowRight++; }
      }
    }
  }
}
for (const v of Object.values(R)) for (const t of Object.values(v)) { t.medianMarginWidth = t.widths.sort((a, b) => a - b)[t.widths.length >> 1] ?? null; delete t.widths; delete t.noGoldAmongLive; }
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1] ?? null;
console.log(JSON.stringify({ perRadius: R, atTheDmdWindow: W, radius0ByLabel: L0, wrongOnSupported: WRONG, selectedRadius: SEL, tiedSetSize: Object.fromEntries(Object.entries(TIED).map(([k, v]) => [k, { n: v.length, median: med(v), max: Math.max(0, ...v) }])) }, null, 1));
