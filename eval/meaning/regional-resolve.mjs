// eval/meaning/regional-resolve.mjs — confidence determined REGIONALLY: the DMD of relative assertions, calibrated against past experience. (The operator, 2026-10-26: "confidence
// needs to be regionally determined based on DMD of relative assertions and a baseline from past experience".) No number is stated by anyone; each part is an organ the repo has:
//   REGION      the mention's company widened hop by hop through the page's own referent graph (nodes that share an atom are neighbours): radius 0, 1, 2, 3. At each radius only the candidates whose
//               region overlaps the mention's are in play, so resolve.mjs's own rule (the pool's chance floor, 1 - 1/n) is read over the REGION's n, not the page's.
//   DMD         resolve at every radius; the WINDOW is the shallowest radius whose top candidate already equals the widest radius's (activation.js dmdWindow: the difference that makes a difference).
//   EXPERIENCE  per region key (window, regional pool size) the share of earlier assertions that were right (add-half smoothed, as resolve smooths), from OTHER pages only (leave-one-page-out:
//               a mention never calibrates itself). A key with no experience abstains: no experience, no assertion.
//   ASSERT      resolve asserts at the window AND the key's past precision reaches the region's chance floor.
// janus resolve.mjs is not changed. Scored against the same gold as resolve-run.mjs (the one page referent sharing the mention's name token).   node eval/meaning/regional-resolve.mjs  (from the workspace root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const J = process.env.JANUS_DIR ?? path.join(K, "../janus");
const { resolveReferent } = await import(pathToFileURL(path.join(J, "native/organs/identity/resolve.mjs")).href);
const { readDocument, rowsOfFor } = await import(path.join(K, "native/reading.js"));
const { atomsOfPage } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const { dmdWindow } = await import(path.join(K, "native/kernel/activation.js"));
const { argText, low } = await import(path.join(K, "native/kernel/atom-support.js"));
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const P = await rowsOfFor("eng"), opts = { claimsOf: P.claimsOf, corefModel, lang: "en" };
const tok = (a) => { const t = low(argText(a)).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((x) => x.length > 2); return t.length ? t.at(-1) : ""; };
const RADII = [0, 1, 2, 3];
const lens = { name: "which being of this page is the claim's end about? (regional)" };
const pageOf = new Map(); for (const s of ["fresh19", "fresh20"]) for (const pg of JSON.parse(fs.readFileSync(path.join(HERE, `${s}.sources.json`), "utf8")).pages ?? []) pageOf.set(pg.url, pg);

// the page's referent graph: nodes that share an atom are neighbours
const graphOf = (atoms) => { const g = new Map(), link = (a, b) => { if (a !== b) { (g.get(a) ?? g.set(a, new Set()).get(a)).add(b); (g.get(b) ?? g.set(b, new Set()).get(b)).add(a); } };
  for (const a of atoms) { const ns = [`v:${a.pred}`, ...(a.args ?? []).map((x) => tok(x) && `w:${tok(x)}`).filter(Boolean)]; for (const x of ns) for (const y of ns) link(x, y); } return g; };
const ball = (nodes, g, r) => { let cur = new Set(nodes); for (let i = 0; i < r; i++) { const nx = new Set(cur); for (const n of cur) for (const m of g.get(n) ?? []) nx.add(m); cur = nx; } return cur; };
const featuresOf = (atoms, id) => { const out = []; for (const a of atoms) { if (!(a.args ?? []).some((x) => x.entity === id)) continue; out.push(`v:${a.pred}`); for (const y of a.args) if (y.entity !== id && tok(y)) out.push(`w:${tok(y)}`); } return out; };

function regionalRead(pageAtoms, g, mentionNodes, ownName, candidates) {
  const perRadius = RADII.map((r) => {
    const mb = ball(mentionNodes, g, r);
    const pool = candidates.map((c) => ({ id: c.id, nodes: [...ball(c.nodes, g, r)] })).filter((c) => c.nodes.some((n) => mb.has(n)));
    const res = pool.length >= 2 ? resolveReferent({ mention: { nodes: [...mb] }, candidates: pool, lens, giver: "khora:regional" }) : { decision: "gap", candidates: [] };
    return { r, n: pool.length, decision: res.decision, top: res.candidates?.[0]?.id ?? null, asserted: res.asserted ?? null };
  });
  const widest = perRadius.at(-1).top;
  const w = dmdWindow(perRadius, (obs) => obs.at(-1)?.top ?? null, { candidates: RADII.map((r) => r + 1), restrict: (o, d) => o.slice(0, d) });
  const at = w.window != null ? perRadius[w.window - 1] : null;
  return { perRadius, window: at ? at.r : null, at, widest };
}

// 1) collect every scored mention with its regional read and whether the top was right
const rows = [];
for (const s of ["fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) {
    if ((p.lang ?? "en") !== "en") continue; const pg = pageOf.get(p.source?.url); if (!pg) continue;
    const page = atomsOfPage(await readDocument(pg.text, { language: "en", lexicon: false, rows: true }), opts), g = graphOf(page.atoms);
    const C = atomsOfPage(await readDocument(p.claim, { language: "en", lexicon: false, minCharacters: 0, rows: true }), opts);
    const names = new Map(); for (const a of page.atoms) for (const x of a.args ?? []) if (x.entity != null && tok(x)) (names.get(x.entity) ?? names.set(x.entity, new Set()).get(x.entity)).add(tok(x));
    const seen = new Set();
    for (const a of C.atoms) for (const x of a.args ?? []) {
      if (x.entity == null || seen.has(x.entity) || !tok(x)) continue; seen.add(x.entity);
      const gold = [...names].filter(([, ts]) => ts.has(tok(x))).map(([id]) => id); if (gold.length !== 1) continue;
      for (const variant of ["COMPANY", "NAMED"]) {
        const cands = [...names].map(([id, ts]) => ({ id, nodes: [...featuresOf(page.atoms, id), ...(variant === "NAMED" ? [...ts].map((t) => `n:${t}`) : [])] })).filter((c) => c.nodes.length);
        const mine = [...featuresOf(C.atoms, x.entity), ...(variant === "NAMED" ? [`n:${tok(x)}`] : [])];
        for (const c of cands) if (variant === "NAMED") for (const t of names.get(c.id)) g.has(`n:${t}`) || g.set(`n:${t}`, new Set());
        const read = regionalRead(page.atoms, g, mine, tok(x), cands);
        rows.push({ page: pg.url, variant, gold: gold[0], read, key: read.at ? `w${read.window}|n${Math.min(read.at.n, 9)}` : "nowindow", topRight: read.at?.top === gold[0], asserted: read.at?.decision === "assert" && read.at.asserted === read.at.top });
      }
    }
  }
}
// 2) experience: per variant and key, from OTHER pages only; assert iff resolve asserted at the window and the key's past precision reaches the region's chance floor
const out = {};
for (const variant of ["COMPANY", "NAMED"]) {
  const mine = rows.filter((r) => r.variant === variant), R = { mentions: mine.length, windowFound: 0, topRightAtWindow: 0, resolveAsserts: 0, assertsRight: 0, regionalAsserts: 0, regionalRight: 0, noExperience: 0, windows: {} };
  for (const r of mine) {
    R.windows[r.read.window ?? "none"] = (R.windows[r.read.window ?? "none"] ?? 0) + 1;
    if (!r.read.at) continue; R.windowFound++; if (r.topRight) R.topRightAtWindow++;
    if (r.asserted) { R.resolveAsserts++; if (r.read.at.top === r.gold) R.assertsRight++; }
    const past = mine.filter((q) => q.page !== r.page && q.key === r.key && q.read.at && q.read.at.decision !== "gap"), right = past.filter((q) => q.topRight).length;
    if (!past.length) { R.noExperience++; continue; }
    const precision = (right + 0.5) / (past.length + 1), floor = 1 - 1 / Math.max(r.read.at.n, 2);
    if (r.read.at.decision !== "gap" && precision >= floor) { R.regionalAsserts++; if (r.topRight) R.regionalRight++; }
  }
  out[variant] = R;
}
console.log(JSON.stringify(out, null, 1));
