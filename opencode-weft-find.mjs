// opencode-weft-find.mjs — the READ side of the weft store: from an ask, the addresses worth looking at, as bytes of turns.md.
//   findInWeft({ ask, task?, dir, hops, max })  -> { hits:[{ address, turn, being, via }], conflicts:[...] }
//   expandHit(hit, { root })                    -> the sentence at the address, verbatim, from the raw file (nothing stored but offsets)
// The index is the lean records themselves (INS beings, CON relations, EVA negations); it is rebuilt from the store per call, a pure fold.
import fs from "node:fs";
import path from "node:path";
import { openStore } from "./native/the-fold/weft-store.mjs";
import { weftDir } from "./opencode-weft-record.mjs";

const WORD = /[a-z_][a-z0-9_]*/g;
export function findInWeft({ ask = "", task = null, dir = weftDir(), hops = 1, max = 5 } = {}) {
  let passes = []; try { passes = openStore(dir).passes(); } catch { return { hits: [], conflicts: [], gap: "no-store" }; }
  if (task) passes = passes.filter((p) => p.a.startsWith(`${task}/`));
  const beings = new Map(), cons = [];
  const addBeing = (b, p, at) => { if (!beings.has(b)) beings.set(b, []); beings.get(b).push({ p, at }); };
  for (const p of passes) {
    for (const b of p.ins) addBeing(b, p, p.ws ?? p.w ?? 0);
    const neg = new Set((p.eva ?? []).filter((v) => v[0] === "con").map((v) => v[1]));
    p.con.forEach((c, i) => cons.push({ p, e1: c[0], label: c[1], e2: c[2], at: c[3], neg: neg.has(i), turn: /^t(\d+)$/.exec(c[6] ?? "")?.[1] ?? null }));
  }
  const terms = [...new Set(String(ask).toLowerCase().match(WORD) ?? [])].filter((w) => beings.has(w));
  const score = new Map(); // `${a}@${at}` -> { hit, w }
  const put = (p, at, being, via, w) => { const k = `${p.a}@${at}`; const cur = score.get(k); if (!cur || cur.w < w) score.set(k, { w, hit: { address: `${p.a}#${at}`, file: p.a, at, turn: null, being, via } }); };
  for (const b of terms) for (const r of beings.get(b)) put(r.p, r.at, b, "named", 1 / beings.get(b).length);
  for (const c of cons) {
    if (!terms.includes(c.e1) && !terms.includes(c.e2)) continue;
    put(c.p, c.at, terms.includes(c.e1) ? c.e1 : c.e2, "relation", 0.9 / Math.max(1, (beings.get(c.e1) ?? []).length));
    if (hops > 0) { const other = terms.includes(c.e1) ? c.e2 : c.e1; for (const r of beings.get(other) ?? []) put(r.p, r.at, other, `hop via ${c.e1} ${c.label} ${c.e2}`, 0.5 / (beings.get(other) ?? []).length); }
  }
  const hits = [...score.values()].sort((a, b) => b.w - a.w).slice(0, max).map((s) => s.hit);
  const by = new Map(); for (const c of cons) { const k = `${c.e1}|${c.label}|${c.e2}`; if (!by.has(k)) by.set(k, []); by.get(k).push(c); }
  const conflicts = [...by].filter(([, g]) => new Set(g.map((x) => x.neg)).size === 2 && new Set(g.map((x) => x.p.a)).size >= 2 && (terms.length === 0 || terms.some((t) => g[0].e1 === t || g[0].e2 === t)))
    .map(([k, g]) => ({ relation: k, holds: g.filter((x) => !x.neg).map((x) => `${x.p.a}#${x.at}`), denies: g.filter((x) => x.neg).map((x) => `${x.p.a}#${x.at}`) }));
  return { hits, conflicts };
}

/** The sentence at an address, verbatim from the raw turns file under `root` (the worknotes root). */
export function expandHit(hit, { root } = {}) {
  const file = path.join(root, hit.file); let buf; try { buf = fs.readFileSync(file); } catch { return { gap: "source_unreadable", address: hit.address }; }
  let s = hit.at, e = hit.at;
  while (s > 0 && !/[.!?\n]/.test(String.fromCharCode(buf[s - 1]))) s--;
  while (e < buf.length && !/[.!?\n]/.test(String.fromCharCode(buf[e]))) e++;
  return { address: hit.address, text: buf.subarray(s, Math.min(buf.length, e + 1)).toString("utf8").trim() };
}
