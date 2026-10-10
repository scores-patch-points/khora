// attackA2.mjs -- ATTACK A (equal unit length by re-windowing): every real pocket, both halves; each document's token stream is cut into non-overlapping windows of exactly W tokens (partial last window dropped),
// W in {4,6,8,12,20,32,64}; windows taken in sha256 order until T = 20000 tokens (equal token count and EXACTLY equal unit length across pockets). depLen v and z (10 within-unit draws, atlas seeds).
//   node attackA2.mjs [--pockets ids] [--out A2] [--T 20000] [--draws 10]       -> A2/<id>.json
import fs from "node:fs";
import path from "node:path";
import { halves, depCell, statusOf, loadCached, TABLE, HERE, sha256, tokensOf } from "./lib.mjs";
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(HERE, opt("--out", "A2")), T = Number(opt("--T", 20000)), DRAWS = Number(opt("--draws", 10)), WS = [4, 6, 8, 12, 20, 32, 64];
const rows = TABLE().filter((r) => r.kind === "real" && !r.thin), WANT = opt("--pockets", null)?.split(",") ?? rows.map((r) => r.id), rowOf = new Map(rows.map((r) => [r.id, r]));
fs.mkdirSync(OUT, { recursive: true });
const hashOrder = (n, tag) => { const k = Array.from({ length: n }, (_, i) => [sha256(`${tag}:${i}`), i]); k.sort((a, b) => (a[0] < b[0] ? -1 : 1)); return k.map((x) => x[1]); };
function windows(units, docOf, W) {
  const out = []; let d = -1, cur = [];
  const flush = () => { for (let i = 0; i + W <= cur.length; i += W) out.push(cur.slice(i, i + W)); cur = []; };
  for (let k = 0; k < units.length; k++) { if (docOf[k] !== d) { flush(); d = docOf[k]; } for (const w of units[k]) cur.push(w); }
  flush(); return out;
}
for (const id of WANT) {
  const file = path.join(OUT, `${id}.json`);
  if (fs.existsSync(file)) continue;
  const r = rowOf.get(id), p = loadCached(id), H = halves(p), res = { id, atlasStatus: r.status, group: r.group, register: r.register, grain: r.grain, mul: r.mul, atlas: { discover: { v: r.vD, z: r.zD }, confirm: { v: r.vC, z: r.zC } }, W: {} };
  for (const W of WS) {
    const cells = {};
    for (const w of ["discover", "confirm"]) {
      const win = windows(H[w].units, H[w].docOf, W), ord = hashOrder(win.length, `A2:${id}:${w}:${W}`), keep = [];
      for (let i = 0, cum = 0; i < ord.length && cum + W <= T; i++) { keep.push(ord[i]); cum += W; }
      keep.sort((a, b) => a - b);
      if (keep.length * W < 0.9 * T) { cells[w] = null; continue; }
      const units = keep.map((i) => win[i]);
      cells[w] = depCell({ id, which: w, units, docOf: units.map(() => 0) }, DRAWS, id, w);
    }
    res.W[W] = { discover: cells.discover, confirm: cells.confirm, status: cells.discover && cells.confirm ? statusOf(cells.discover, cells.confirm) : "n/a" };
  }
  fs.writeFileSync(file, JSON.stringify(res));
  console.error(`${id} ${r.status} ` + WS.map((W) => `${W}:${res.W[W].status}`).join(" "));
}
