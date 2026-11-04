// ABLATION (descriptive, no bar, development data only): for the questions where the context arm S1g ranks its first gold better than the bare arm S0g,
// which part of the unit text carries the gain? Re-embed the best gold unit with (a) the bound referent name dropped, (b) each mention-span being dropped,
// (c) each single whitespace token of the whole unit text dropped; all other units unchanged; report the rank of that unit under S1g scoring.
// usage: node ablate.mjs <khora dir> <questions.json> <texts dir> <out.json>
import fs from "node:fs";
import { runAll, makeEmbedder, smellScores, ranksOf, poolDocsOf } from "../rank0-lib.mjs";
const [K, QF, TD, OUT] = process.argv.slice(2);
const cache = process.env.RANK0_CACHE || null;
const qs = JSON.parse(fs.readFileSync(QF, "utf8")).new;
const res = await runAll(K, qs, TD, { cacheDir: cache, embCache: cache ? `${cache}/emb.json` : null, log: () => {} });
const emb = makeEmbedder(cache ? `${cache}/emb.json` : null);
const out = [];
for (const p of res.perQuestion) {
  if (!p.gold.length || !(p.ranks.S1g < p.ranks.S0g)) continue;
  const qn = qs.find((q) => q.id === p.id);
  const pool = [], E1 = [];
  for (const d of poolDocsOf(qn)) res._read[d].forEach((u, i) => { pool.push(u); E1.push(res._D[d].s1[i]); });
  const [qv] = await emb.embed(["search_query: " + qn.q]);
  const rankOf = (gi, vec) => { const E = E1.slice(); E[gi] = vec; return ranksOf(smellScores(qv, E, true))[gi]; };
  // the best gold unit under S1g
  const base = ranksOf(smellScores(qv, E1, true));
  const gi = p.gold.slice().sort((a, b) => base[a] - base[b])[0], u = pool[gi];
  const bareRank = (() => { const E = []; for (const d of poolDocsOf(qn)) E.push(...res._D[d].s0); return ranksOf(smellScores(qv, E, true))[gi]; })();
  const variants = [];
  const add = (label, text) => variants.push({ label, text });
  if (u.bound) add("drop bound referent: " + u.bound, [...u.names.filter((n) => n !== u.bound)].join(", ").replace(/^/, "") ? `${u.names.filter((n) => n !== u.bound).join(", ")} — ${u.text}` : u.text);
  for (const n of u.names) if (n !== u.bound) add("drop mention being: " + n, u.names.length > 1 ? `${u.names.filter((x) => x !== n).join(", ")} — ${u.text}` : u.text);
  const toks = u.unitText.split(/\s+/);
  toks.forEach((t, i) => add("drop token " + i + ": " + t, toks.filter((_, j) => j !== i).join(" ")));
  const vecs = await emb.embed(variants.map((v) => "search_document: " + v.text)); emb.save();
  const rows = variants.map((v, k) => ({ label: v.label, rank: rankOf(gi, vecs[k]) }));
  const worse = rows.filter((r) => r.rank > base[gi]).sort((a, b) => b.rank - a.rank);
  out.push({ id: p.id, q: qn.q, gold: u.text.slice(0, 100), names: u.names, bound: u.bound, bareRank, fullRank: base[gi], withoutAnyNames: undefined, falls: worse.slice(0, 8), nTokenDrops: toks.length, worseCount: worse.length });
  console.log(p.id, "|", qn.q, "| bare", bareRank, "-> full", base[gi], "| names:", JSON.stringify(u.names), "bound:", u.bound);
  for (const r of worse.slice(0, 6)) console.log("     falls to", r.rank, r.label);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
