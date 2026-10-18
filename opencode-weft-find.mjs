// opencode-weft-find.mjs — the READ side of the weft store: from an ask, the addresses worth looking at, as bytes of turns.md.
//   findInWeft({ ask, task?, dir, hops, max })  -> { hits:[{ address, turn, being, via }], conflicts:[...] }
//   expandHit(hit, { root })                    -> the sentence at the address, verbatim, from the raw file (nothing stored but offsets)
// The index is the lean records themselves (INS beings, CON relations, EVA negations); it is rebuilt from the store per call, a pure fold.
import fs from "node:fs";
import path from "node:path";
import { unpack } from "./native/the-fold/weft-lean.mjs";
import { weftDir } from "./opencode-weft-record.mjs";
import { semanticTerms } from "./opencode-semantic.mjs";

const WORD = /[a-z_][a-z0-9_]*/g;
// segments are immutable once written, so each is unpacked once per process; only new segments are read on a later call
const SEG = new Map(); // `${dir}/${file}` -> passes
function storePasses(dir) {
  const files = fs.readdirSync(dir).filter((f) => /^seg-\d{6}\.bin$/.test(f)).sort();
  return files.flatMap((f) => { const k = `${dir}/${f}`; if (!SEG.has(k)) SEG.set(k, unpack(fs.readFileSync(path.join(dir, f)))); return SEG.get(k); });
}
export function findInWeft({ ask = "", task = null, dir = weftDir(), hops = 1, max = 5, extraTerms = [] } = {}) {
  let passes = []; try { passes = storePasses(dir); } catch { return { hits: [], conflicts: [], gap: "no-store" }; }
  if (task) passes = passes.filter((p) => p.a.startsWith(`${task}/`));
  const beings = new Map(), cons = [];
  const addBeing = (b, p, at) => { if (!beings.has(b)) beings.set(b, []); beings.get(b).push({ p, at }); };
  for (const p of passes) {
    for (const b of p.ins) addBeing(b, p, p.ws ?? p.w ?? 0);
    const neg = new Set((p.eva ?? []).filter((v) => v[0] === "con").map((v) => v[1]));
    p.con.forEach((c, i) => cons.push({ p, e1: c[0], label: c[1], e2: c[2], at: c[3], neg: neg.has(i), turn: /^t(\d+)$/.exec(c[6] ?? "")?.[1] ?? null }));
  }
  const terms = [...new Set([...(String(ask).toLowerCase().match(WORD) ?? []), ...extraTerms.map((t) => String(t).toLowerCase())])].filter((w) => beings.has(w));
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

/** The beings a store holds (for a task, or all): the vocabulary a semantic cue can land on. */
export function beingsInWeft({ task = null, dir = weftDir() } = {}) {
  let passes = []; try { passes = storePasses(dir); } catch { return []; }
  if (task) passes = passes.filter((p) => p.a.startsWith(`${task}/`));
  return [...new Set(passes.flatMap((p) => p.ins))];
}

/** The vocabulary WITH its sentences: each being paired with a sentence it was stated in (read verbatim from the raw turns by
 *  address, so the store still holds offsets only). A being whose sentence cannot be read stays a bare term. */
export function vocabInWeft({ task = null, dir = weftDir(), root = null } = {}) {
  let passes = []; try { passes = storePasses(dir); } catch { return []; }
  if (task) passes = passes.filter((p) => p.a.startsWith(`${task}/`));
  const out = [], seen = new Set();
  for (const p of passes) {
    for (const c of p.con) {
      for (const e of [c[0], c[2]]) {
        if (!p.ins.includes(e) || seen.has(`${e}@${p.a}#${c[3]}`)) continue;
        seen.add(`${e}@${p.a}#${c[3]}`);
        const text = root ? expandHit({ file: p.a, at: c[3], address: `${p.a}#${c[3]}` }, { root })?.text : null;
        out.push(text ? { term: e, text } : e);
      }
    }
    for (const b of p.ins) if (!out.some((o) => (o.term ?? o) === b)) out.push(b);
  }
  return out;
}

/**
 * findInWeft with a semantic fallback: when the lexical read finds nothing for the ask, the ask is matched against the
 * store's own beings by meaning (opencode-semantic.mjs) and the read is repeated with those beings as if the ask had
 * named them. Lexical-only mode (embedder down, FOLD_SEMANTIC=0) returns the lexical result untouched, with the gap named.
 */
export async function findInWeftSemantic(opts = {}) {
  const lexical = findInWeft(opts);
  if (lexical.hits.length > 0 || lexical.gap === "no-store") return { ...lexical, via: "lexical" };
  const sem = await semanticTerms({ ask: opts.ask, vocab: opts.root ? vocabInWeft(opts) : beingsInWeft(opts), embedFn: opts.embedFn, env: opts.env });
  if (!sem.terms.length) return { ...lexical, via: "lexical", semanticGap: sem.gap };
  const r = findInWeft({ ...opts, extraTerms: sem.terms });
  return { ...r, via: r.hits.length ? "semantic" : "lexical", semantic: sem.terms };
}
