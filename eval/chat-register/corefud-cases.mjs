// corefud-cases.mjs — the CorefUD reader and the anaphor cases of salience-languages.mjs, shared by the evaluations of the salience prior: { anaphorRole, gold, candidates: [{ id, mentions, roles }], zero }.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { roleOfDeprel, WINDOW } = await import("file://" + ROOT + "/native/adapters/text/salience-prior.js");
const RANK = { S: 3, O: 2, X: 1 };
export function parse(file, maxSents = Infinity) {
  const docs = []; let doc = null, sent = null, n = 0;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# newdoc")) { doc = { sents: [] }; docs.push(doc); continue; } if (line === "") { sent = null; if (n >= maxSents) break; continue; } if (line.startsWith("#")) continue;
    const c = line.split("\t"); if (!/^\d+(\.\d+)?$/.test(c[0])) continue;   // regex-ok: a CoNLL-U token id, not language
    if (!sent) { sent = { toks: [], mentions: [], stack: [] }; (doc ?? (doc = { sents: [] }, docs.push(doc))).sents.push(sent); n++; }
    const zero = c[0].includes("."), t = { i: sent.toks.length, id: c[0], form: c[1], upos: c[3], feats: c[5], head: c[6], deprel: zero ? (c[8].split(":").slice(1).join(":") || "") : c[7], zero }; sent.toks.push(t);
    const ent = (c[9].split("|").find((x) => x.startsWith("Entity=")) ?? "").slice(7);
    for (let k = 0; k < ent.length;) { if (ent[k] === "(") { let j = k + 1; while (j < ent.length && ent[j] !== "(" && ent[j] !== ")") j++; sent.stack.push({ id: ent.slice(k + 1, j).split("-")[0], start: t.i }); k = j; } else if (ent[k] === ")") { const m = sent.stack.pop(); if (m) sent.mentions.push({ ...m, end: t.i }); k++; } else k++; }
  }
  return docs;
}
export const headOf = (s, m) => { const toks = s.toks.slice(m.start, m.end + 1), ids = new Set(toks.map((x) => x.id)); return toks.find((x) => !ids.has(x.head)) ?? toks[0]; };

const roleIn = (doc, si, id, before = Infinity) => { let best = null; if (!doc.sents[si]) return "-"; for (const mm of doc.sents[si].mentions) if (mm.id === id && mm.start < before) { const r = roleOfDeprel(headOf(doc.sents[si], mm).deprel); if (!best || RANK[r] > RANK[best]) best = r; } return best ?? "-"; };
export function cases(docs) {
  const out = [];
  for (const d of docs) { const seen = new Set();
    for (let si = 0; si < d.sents.length; si++) { const s = d.sents[si];
      for (const m of [...s.mentions].sort((a, b) => a.start - b.start)) { const t = s.toks[m.start], isPron = m.start === m.end && t.upos === "PRON";
        const anaph = isPron && (t.zero || /(^|\|)Person=3(\||$)/.test(t.feats ?? ""));   // regex-ok: a UD feature string
        if (!anaph) { seen.add(m.id); continue; } if (!seen.has(m.id)) { seen.add(m.id); continue; } seen.add(m.id);
        const aRole = t.zero ? "S" : roleOfDeprel(t.deprel), cand = new Map();
        for (let sj = Math.max(0, si - WINDOW + 1); sj <= si; sj++) for (const mm of d.sents[sj].mentions) { if (mm === m || (sj === si && mm.start >= m.start)) continue; cand.set(mm.id, (cand.get(mm.id) ?? 0) + 1); }
        if (cand.size < 2) continue;
        const cs = [...cand].map(([id, n]) => ({ id, mentions: n, roles: [0, 1, 2].map((j) => roleIn(d, si - j, id, j === 0 ? m.start : Infinity)), recent: 0 }));
        out.push({ anaphorRole: aRole, gold: m.id, candidates: cs, zero: t.zero }); } } }
  return out;
}
