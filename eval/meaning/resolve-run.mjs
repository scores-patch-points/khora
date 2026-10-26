// eval/meaning/resolve-run.mjs — janus `resolve` (which one is it?) wired to the master reader's page: a claim's end is the MENTION, the source page's referents are the CANDIDATES.
// resolve.mjs ships "tested and ready to be wired in by a reader such as khora's" (RESOLVE.md: no consumer imports it). The page is read by THE reader (reading.js, rows:true),
// resolved once (weft-atoms.js::atomsOfPage), each referent's company is the features of the atoms it takes part in (v:<predicate>, w:<the other end's last name token>, the
// vocabulary atom-world.js uses). Gold = the one page referent whose name shares the mention's name token (a mention with none or several is not scored).
// Variant NAMED carries its own name token as a node (what an ordinary mention keeps); variant COMPANY drops it: can what the claim SAYS of a thing find it on the page?
// The lens states no assertAt, so the pool's own chance floor decides (resolve.mjs). No threshold here.    node eval/meaning/resolve-run.mjs   (from the workspace root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const J = process.env.JANUS_DIR ?? path.join(K, "../janus");
const { resolveReferent } = await import(pathToFileURL(path.join(J, "native/organs/identity/resolve.mjs")).href);
const { readDocument, rowsOfFor } = await import(path.join(K, "native/reading.js"));
const { atomsOfPage } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const { argText, low } = await import(path.join(K, "native/kernel/atom-support.js"));
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const P = await rowsOfFor("eng"), opts = { claimsOf: P.claimsOf, corefModel, lang: "en" };
const tok = (a) => { const t = low(argText(a)).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((x) => x.length > 2); return t.length ? t.at(-1) : ""; };
const companyOf = (atoms, id) => { const nodes = []; for (const a of atoms) { const mine = (a.args ?? []).filter((x) => x.entity === id); if (!mine.length) continue; nodes.push(`v:${a.pred}`); for (const y of a.args) if (y.entity !== id && tok(y)) nodes.push(`w:${tok(y)}`); } return nodes; };
const pageOf = new Map(); for (const s of ["fresh19", "fresh20"]) for (const pg of JSON.parse(fs.readFileSync(path.join(HERE, `${s}.sources.json`), "utf8")).pages ?? []) pageOf.set(pg.url, pg);
const lens = { name: "which being of this page is the claim's end about?" };
const R = { NAMED: { n: 0, assert: 0, ask: 0, gap: 0, refused: 0, assertRight: 0, topRight: 0 }, COMPANY: { n: 0, assert: 0, ask: 0, gap: 0, refused: 0, assertRight: 0, topRight: 0 } }, meta = { pairs: 0, mentions: 0, scored: 0, pool: [] };
for (const s of ["fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) {
    if ((p.lang ?? "en") !== "en") continue; const pg = pageOf.get(p.source?.url); if (!pg) continue; meta.pairs++;
    const page = atomsOfPage(await readDocument(pg.text, { language: "en", lexicon: false, rows: true }), opts);
    const C = atomsOfPage(await readDocument(p.claim, { language: "en", lexicon: false, minCharacters: 0, rows: true }), opts);
    const names = new Map(); for (const a of page.atoms) for (const x of a.args ?? []) if (x.entity != null && tok(x)) (names.get(x.entity) ?? names.set(x.entity, new Set()).get(x.entity)).add(tok(x));
    const cands = (nameToken) => [...names].filter(([, ts]) => nameToken ? true : true).map(([id, ts]) => ({ id, ts }));
    const poolOf = (withName) => [...names].map(([id, ts]) => ({ id, nodes: [...companyOf(page.atoms, id), ...(withName ? [...ts].map((t) => `n:${t}`) : [])] })).filter((c) => c.nodes.length);
    const seen = new Set();
    for (const a of C.atoms) for (const x of a.args ?? []) {
      if (x.entity == null || seen.has(x.entity) || !tok(x)) continue; seen.add(x.entity); meta.mentions++;
      const gold = [...names].filter(([, ts]) => ts.has(tok(x))).map(([id]) => id); if (gold.length !== 1) continue; meta.scored++;
      for (const [variant, withName] of [["NAMED", true], ["COMPANY", false]]) {
        const pool = poolOf(withName), mine = companyOf(C.atoms, x.entity); if (withName) mine.push(`n:${tok(x)}`);
        meta.pool.push(pool.length);
        const r = resolveReferent({ mention: { nodes: mine }, candidates: pool, lens, giver: "khora:page-read" }), V = R[variant]; V.n++;
        V[r.decision] = (V[r.decision] ?? 0) + 1;
        const top = r.candidates?.[0]?.id; if (top === gold[0]) V.topRight++; if (r.decision === "assert" && r.asserted === gold[0]) V.assertRight++;
      }
    }
  }
}
meta.pool = { median: meta.pool.sort((a, b) => a - b)[meta.pool.length >> 1], max: Math.max(...meta.pool) };
console.log(JSON.stringify({ ...meta, ...R }, null, 1));
