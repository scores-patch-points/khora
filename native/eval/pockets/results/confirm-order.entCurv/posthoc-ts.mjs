// results/confirm-order.entCurv/posthoc-ts.mjs — POST HOC (NOT pre-registered; written after seeing that ec-cd-ts has z = -30.1 in the discover half and +4.3 in the confirm half) 
// Where does the sign split inside the TypeScript sibling come from? The pocket is cut by file group (package of the opencode clone; test vs source; tsx vs ts) and entCurv (same prep + posStats code as the
// family) is computed for each group in each half, with a 20-draw within-unit null (seeds seedOf(id, half, 'posthoc-group', group, k)). Exploratory: it cannot change the verdict.
//   node posthoc-ts.mjs > posthoc-ts.json
import path from "node:path";
import { halves, nullView, seedOf, sha256 } from "../../lib/pocket.mjs";
import { prep } from "../../laws/_order_prep.mjs";
import { posStats } from "../../laws/_order_pos.mjs";
import { loadAll } from "./describe-siblings.mjs";
const p = (await loadAll(["ec-cd-ts"]))[0], R = "/Users/mlacy/Documents/3.0/opencode-fold/";
const side = (d) => parseInt(sha256(`${p.id}:${d}`).slice(0, 2), 16) & 1;
const fileOf = (d) => p.meta.fileList[d].replace(R, "");
const groupOf = {
  package: (f) => (/^packages\/([^/]+)\//.exec(f)?.[1] ?? "other"),
  kind: (f) => (/(^|\/)(test|tests|e2e|__tests__)\//.test(f) || /\.(test|spec)\.tsx?$/.test(f) ? "test" : "source"),
  ext: (f) => (f.endsWith(".tsx") ? "tsx" : "ts"),
  i18n: (f) => (/(^|\/)(i18n|locales?)\//.test(f) ? "i18n" : "rest"),
};
const ent = (units) => { const P = prep({ units }); if (P.N < 2000 || P.V < 30) return null; return posStats(P).entCurv ?? null; };
const stat = (xs) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return [m, Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))]; };
const out = { id: p.id, files: p.meta.fileList.length, byHalf: { 0: 0, 1: 0 }, groups: {} };
for (const [gname, gf] of Object.entries(groupOf)) {
  const levels = [...new Set(p.meta.fileList.map((f, d) => gf(fileOf(d))))].sort();
  for (const lv of levels) for (const which of [0, 1, "all"]) {
    const units = []; let nf = 0;
    for (let k = 0; k < p.units.length; k++) { const d = p.docOf[k]; if (gf(fileOf(d)) === lv && (which === "all" || side(d) === which)) units.push(p.units[k]); }
    nf = new Set(p.docOf.filter((d, k) => gf(fileOf(d)) === lv && (which === "all" || side(d) === which))).size;
    const tok = units.reduce((a, u) => a + u.length, 0), v = ent(units); let z = null, nm = null;
    if (v != null) { const dr = []; for (let k = 0; k < 20; k++) { const x = ent(nullView({ units }, "within-unit", seedOf(p.id, which, "posthoc-group", `${gname}:${lv}`, k)).units); if (x != null) dr.push(x); } if (dr.length >= 3) { const [m, s] = stat(dr); nm = m; z = (v - m) / s; } }
    out.groups[`${gname}=${lv}|half=${which === 0 ? "discover?" : which === 1 ? "confirm?" : "all"}`] = { files: nf, tokens: tok, v, nullMean: nm, z };
  }
}
for (let d = 0; d < p.meta.fileList.length; d++) out.byHalf[side(d)]++;
console.log(JSON.stringify(out, null, 1));
