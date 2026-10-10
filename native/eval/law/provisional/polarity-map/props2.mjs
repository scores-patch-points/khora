// provisional/polarity-map/props2.mjs — second set of LABEL-FREE register properties (slot composition of the register's own RARE forms), computed from streams only.
// Measurement script (no test, no threshold): usage node props2.mjs disc|conf  -> results/props2.<split>.json. rare = own-stream rank bin >= 7; top = rank bin <= 1; edge = unit edge.
// rareL_edge/rareL_top/rareL_rare = share of rare-form tokens whose LEFT neighbour is an edge / a top-3 form / a rare form (rareR_* likewise on the RIGHT); rareAnchorAsym = (rareL_edge+rareL_top) - (rareR_edge+rareR_top).
// Definitions fixed in analyse2.mjs's header before it is run.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import * as R from "./registers.mjs";
import { round } from "./lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), split = process.argv[2] ?? "disc";
export function propsOf2(P) {
  let n = 0, le = 0, lt = 0, lr = 0, re = 0, rt = 0, rr = 0;
  for (const u of P.stream) u.forEach((w, i) => {
    const b = P.bins.get(w) ?? 11; if (b < 7) return; n++;
    const l = i > 0 ? P.bins.get(u[i - 1]) ?? 11 : 12, r = i + 1 < u.length ? P.bins.get(u[i + 1]) ?? 11 : 12;
    if (l === 12) le++; else if (l <= 1) lt++; else if (l >= 7) lr++; if (r === 12) re++; else if (r <= 1) rt++; else if (r >= 7) rr++;
  });
  const f = (x) => round(x / n);
  return { rareL_edge: f(le), rareL_top: f(lt), rareL_rare: f(lr), rareR_edge: f(re), rareR_top: f(rt), rareR_rare: f(rr), rareAnchorAsym: round((le + lt - re - rt) / n), nRare: n };
}
const avg = (ps) => Object.fromEntries(Object.keys(ps[0]).map((k) => [k, round(ps.reduce((a, p) => a + p[k], 0) / ps.length)]));
const out = {};
if (split === "disc") {
  for (const stem of R.allStems()) { const b = R.udBase(stem, "dev"); if (b) out[`ud-${stem}`] = propsOf2(b.P); }
  const sp = JSON.parse(fs.readFileSync(path.join(HERE, "results", "irc-split.json"), "utf8")), cand = (id) => ({ id, path: path.join(R.IRC_ROOT, id) });
  for (const lg of Object.keys(sp)) out[`irc-${lg}`] = propsOf2(R.ircBase(`irc-${lg}-disc`, sp[lg].disc.map(cand)).P);
  const G = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/";
  out["book-war-and-peace"] = propsOf2(R.wpBase().P);
  for (const [nm, f] of [["book-pride-and-prejudice", "pg1342_Pride_and_Prejudice.txt"], ["book-tale-of-two-cities", "pg98_A_Tale_of_Two_Cities.txt"]]) out[nm] = propsOf2(R.bookBase(nm, R.loadText(G + f)).P);
  for (const [lg, n] of [["js", 12], ["py", 12], ["rb", 8]]) out[`code-${lg}`] = avg(Array.from({ length: n }, (_, i) => propsOf2(R.codeBase(lg, i).P)));
}
fs.writeFileSync(path.join(HERE, "results", `props2.${split}.json`), JSON.stringify(out, null, 1)); console.log(Object.keys(out).length, "registers");
