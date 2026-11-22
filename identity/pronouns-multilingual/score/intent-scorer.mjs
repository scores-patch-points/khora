// intent-scorer.mjs — score the INTENT-weighted anaphora against golden CorefUD.
// Same conversion as predict-corefud.mjs, but the pronoun binding is re-weighted by the kāraka
// agenthood: a pronoun binds to the referent the speaker made the AGENT (kartṛ), not just the
// most present. Baseline = the reader's own pronounsGuess; intent = the re-weighting.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const W = path.resolve(HERE, "../../..");
const { parseCorefUD } = await import("../fra/lib-corefud.mjs");
const { read } = await import(W + "/native/reading-one.mjs");
const [dsName, split, lang, nArg] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const DATA = `/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data/CorefUD_${dsName}`;
const file = fs.readdirSync(DATA).find((f) => f.endsWith(`-${split}.conllu`)); const docs = parseCorefUD(path.join(DATA, file)); const header = docs.header ?? [];
const docsTo = nArg ? docs.slice(0, +nArg) : docs;
const OUT = path.join(HERE, "out", `${dsName}-${split}-intent`); fs.mkdirSync(OUT, { recursive: true });
const keyLines = [...header], sysLines = [...header];
const stripMisc = (misc) => (misc === "_" ? [] : misc.split("|").filter((x) => !/^(Entity|Bridge|SplitAnte)=/.test(x)));
let nMent = 0, dropped = 0;
for (const doc of docsTo) {
  const text = doc.sents.map((s) => s.text).join(" "); const offs = []; let o = 0; for (const s of doc.sents) { offs.push(o); o += s.text.length + 1; }
  // read with rows, so the kāraka roles are available
  const w = await read(text, { rows: true, allowDegraded: true, language: lang, address: `sc:${dsName}:${doc.id}`, admitNominals: true, speakers: true });
  // referent surfaces + their agenthood (kartṛ count) from the parse rows
  const agenthood = new Map();
  for (const p of w.parse ?? []) for (const row of p.rows) if (row.karaka === "kartṛ" && (row.lemma || row.form)) {
    const surf = (row.lemma || row.form).toLowerCase(); agenthood.set(surf, (agenthood.get(surf) ?? 0) + 1);
  }
  // names + noun phrases -> cluster (cast being ref); I/you -> speaker/addressee; 3rd-person -> re-bound by intent
  const mentions = [];
  for (const c of w.cast ?? []) { for (const [a, b] of c.mentionSpans ?? []) mentions.push({ a, b, cl: c.ref, surface: c.surface.toLowerCase(), kind: "name" }); }
  for (const sb of w.speakerBindings ?? []) if (Array.isArray(sb) === false && typeof sb === "object" && "a" in sb) mentions.push({ a: sb.a, b: sb.b, cl: sb.cl, kind: "pronoun" });
  const pron = (w.pronounsGuess ?? w.pronounsPresence ?? []).filter((p) => p.ref);   // only pronouns the reader bound (has a referent)
  // candidate referents with presence activation, then intent re-weight by agenthood
  const cands = new Map(); for (const c of w.cast ?? []) cands.set(c.ref, { surface: c.surface.toLowerCase(), ref: c.ref, mentions: c.mentionSpans?.length ?? 0 });
  // build the presence ordering the reader used: pronouns are in document order; the reader binds to the most recent
  const recent = [];
  const byOffset = (a, b) => a - b;
  for (const m of mentions.sort(byOffset)) if (m.kind === "name") { recent.push(m.cl); }
  for (const p of pron) {
    // intent weight: presence (how recent) + agenthood (how much the speaker made it the agent)
    const weight = (ref) => { const c = cands.get(ref); const rec = recent.lastIndexOf(ref) >= 0 ? 1 : 0; return rec * 0.5 + (agenthood.get(c?.surface) ?? 0); };
    let best = null, bestW = -1;
    for (const [ref, c] of cands) { const w2 = weight(ref); if (w2 > bestW) { bestW = w2; best = ref; } }
    mentions.push({ a: p.at[0], b: p.at[1], cl: best, kind: "pronoun" });
  }
  // the same sentence/token alignment as predict-corefud.mjs
  const bySent = doc.sents.map(() => []); const seen = new Set();
  for (const m of mentions) { let si = -1; for (let i = doc.sents.length - 1; i >= 0; i--) if (offs[i] <= m.a) { si = i; break; } if (si < 0) { dropped++; continue; } const s = doc.sents[si]; const ra = m.a - offs[si], rb = m.b - offs[si]; if (rb > s.text.length + 1) { dropped++; continue; }
    const idx = s.tokens.map((t, k) => (t.start < rb && t.end > ra ? k : -1)).filter((k) => k >= 0); if (!idx.length) { dropped++; continue; } const t0 = idx[0], t1 = idx.at(-1); const key = si + ":" + t0 + ":" + t1 + ":" + m.cl; if (seen.has(key)) continue; seen.add(key); bySent[si].push({ t0, t1, cl: m.cl }); }
  const clusterIds = new Map(); const eid = (cl) => clusterIds.get(cl) ?? (clusterIds.set(cl, "e" + (clusterIds.size + 1)), clusterIds.get(cl));
  const entFor = (s, list) => {
    list.sort((x, y) => x.t0 - y.t0 || y.t1 - x.t1); const kept = []; for (const m of list) { if (kept.some((k) => k.t0 === m.t0 && k.t1 === m.t1 && k.cl === m.cl)) continue; if (kept.some((k) => (k.t0 < m.t0 && m.t0 <= k.t1 && m.t1 > k.t1) || (m.t0 < k.t0 && k.t0 <= m.t1 && k.t1 > m.t1))) { dropped++; continue; } kept.push(m); }
    const head = (m) => { const ids = new Set(s.tokens.slice(m.t0, m.t1 + 1).map((t) => t.id)); const hi = s.tokens.slice(m.t0, m.t1 + 1).findIndex((t) => !ids.has(t.head)); return (hi < 0 ? m.t1 - m.t0 : hi) + 1; };
    const out = s.tokens.map(() => ({ close: [], open: [] })); for (const m of kept) { const id = eid(m.cl); if (m.t0 === m.t1) out[m.t0].open.push({ m, str: `(${id}--${head(m)})` }); else { out[m.t0].open.push({ m, str: `(${id}--${head(m)}` }); out[m.t1].close.push({ m, str: `${id})` }); } }
    return out.map((x) => { x.close.sort((p, q) => q.m.t0 - p.m.t0); x.open.sort((p, q) => q.m.t1 - p.m.t1); const singles = x.open.filter((y) => y.str.endsWith(")")), opens = x.open.filter((y) => !y.str.endsWith(")")); return [...x.close.map((y) => y.str), ...opens.map((y) => y.str), ...singles.map((y) => y.str)].join(""); });
  };
  keyLines.push(doc.raw0); sysLines.push(doc.raw0);
  doc.sents.forEach((s, si) => { const ent = entFor(s, bySent[si]); nMent += bySent[si].length;
    const emit = (src, kind) => { for (const ln of s.lines) { const tk = s.tokens.find((t) => s.lines[t.li] === ln); if (!tk || !/^\d+\t/.test(ln)) { if (kind === "sys" && /^\d+\.\d+\t/.test(ln)) { const f = ln.split("\t"); const misc = stripMisc(f[9]); f[9] = misc.length ? misc.join("|") : "_"; src.push(f.join("\t")); } else src.push(ln); continue; } if (kind === "key") { src.push(ln); continue; } const f = ln.split("\t"); const misc = stripMisc(f[9]); const e = ent[s.tokens.indexOf(tk)]; if (e) misc.push("Entity=" + e); f[9] = misc.length ? misc.join("|") : "_"; src.push(f.join("\t")); } src.push(""); };
    emit(keyLines, "key"); emit(sysLines, "sys"); });
}
fs.writeFileSync(path.join(OUT, "key.conllu"), keyLines.join("\n") + "\n"); fs.writeFileSync(path.join(OUT, "sys.conllu"), sysLines.join("\n") + "\n"); console.log(`${dsName} ${split} intent: docs ${docsTo.length}, mentions ${nMent}, dropped ${dropped} -> ${OUT}`);
