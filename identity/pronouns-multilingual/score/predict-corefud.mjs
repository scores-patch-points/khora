// predict-corefud.mjs <Dataset> <split> <lang> [N docs] [--oracle] — write a KEY and a SYSTEM conllu in the CorefUD 1.0 format for the official scorer (identity/givers/corefud-scorer), from the canonical read.
// The system's entities: each cast being is a cluster of its mention spans (names) plus the pronouns the read binds to it (English: pronounsGuess; other languages: pronounsPresence); a mention is the token range its character span overlaps; heads come from the UD tree.
// --oracle writes the GOLD mentions as the system (a format self-test: the writer's output must parse back to the gold entities). Nothing is tuned: the score is whatever the official scorer says.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const W = path.resolve(HERE, "../../..");
const { parseCorefUD } = await import("../fra/lib-corefud.mjs"); const { readToWeft } = await import(W + "/native/the-fold/read-process.mjs"); const { speakerReferents } = await import(W + "/native/adapters/text/speakers.js");
const [dsName, split, lang, nArg] = process.argv.slice(2).filter((x) => !x.startsWith("--")); const oracle = process.argv.includes("--oracle"); const DATA = `/Users/mlacy/Documents/khora-cast/khora/identity/pronouns-multilingual/data/fra/corefud/CorefUD-1.3-public/data/CorefUD_${dsName}`;
const file = fs.readdirSync(DATA).find((f) => f.endsWith(`-${split}.conllu`)); let docs = parseCorefUD(path.join(DATA, file)); const header = docs.header ?? []; if (nArg) docs = docs.slice(0, +nArg);
const SPK = process.env.SPEAKERS ?? ""; const OUT = path.join(HERE, "out", `${dsName}-${split}${oracle ? "-oracle" : ""}${SPK ? "-spk" + SPK : ""}`); fs.mkdirSync(OUT, { recursive: true });
const keyLines = [...header], sysLines = [...header]; let nMent = 0, nClus = 0, dropped = 0;
const stripMisc = (misc) => (misc === "_" ? [] : misc.split("|").filter((x) => !/^(Entity|Bridge|SplitAnte)=/.test(x)));
for (const doc of docs) {
  const text = doc.sents.map((s) => s.text).join(" "); const offs = []; let o = 0; for (const s of doc.sents) { offs.push(o); o += s.text.length + 1; }
  // the system's mentions: { a, b, cl } in document characters
  let ments = [];
  if (oracle) { doc.sents.forEach((s, si) => s.mentions.forEach((m) => ments.push({ a: offs[si] + m.c0, b: offs[si] + m.c1, cl: m.ent }))); }
  else { const w = readToWeft(text, { language: lang, address: `sc:${dsName}:${doc.id}` }); if (!w.error && !w.skipped) { for (const c of w.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) ments.push({ a, b, cl: c.ref }); const pr = lang === "eng" ? (w.pronounsGuess ?? w.pronounsPresence ?? []) : (w.pronounsPresence ?? []); for (const p of pr) ments.push({ a: p.at[0], b: p.at[1], cl: p.ref });
      // PREREG-ROUND30: speaker and addressee referents for I/you (SPEAKERS=1); SPEAKERS=null is the shuffled control: the same mentions, each assigned a random speaker referent of the same document
      if (SPK && lang === "eng") { const sp = speakerReferents(text, w); const ids = [...new Set(sp.mentions.map((m) => m.cl))]; let seed = 30 + doc.id.length; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; for (const m of sp.mentions) ments.push({ a: m.a, b: m.b, cl: SPK === "null" ? ids[Math.floor(rnd() * ids.length)] : SPK === "one" ? (m.kind === "addressee" ? "one:addressee" : "one:speaker") : m.cl }); } } }
  // per sentence: the token ranges of the mentions, nested properly
  const bySent = doc.sents.map(() => []); const seen = new Set();
  for (const m of ments) { let si = -1; for (let i = doc.sents.length - 1; i >= 0; i--) if (offs[i] <= m.a) { si = i; break; } if (si < 0) { dropped++; continue; } const s = doc.sents[si]; const ra = m.a - offs[si], rb = m.b - offs[si]; if (rb > s.text.length + 1) { dropped++; continue; }
    const idx = s.tokens.map((t, k) => (t.start < rb && t.end > ra ? k : -1)).filter((k) => k >= 0); if (!idx.length) { dropped++; continue; } const t0 = idx[0], t1 = idx.at(-1); const key = si + ":" + t0 + ":" + t1 + ":" + m.cl; if (seen.has(key)) continue; seen.add(key); bySent[si].push({ t0, t1, cl: m.cl }); }
  const clusterIds = new Map(); const eid = (cl) => clusterIds.get(cl) ?? (clusterIds.set(cl, "e" + (clusterIds.size + 1)), clusterIds.get(cl));
  const entFor = (s, list) => { // drop crossing mentions, then build the per-token Entity strings
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
fs.writeFileSync(path.join(OUT, "key.conllu"), keyLines.join("\n") + "\n"); fs.writeFileSync(path.join(OUT, "sys.conllu"), sysLines.join("\n") + "\n"); console.log(`${dsName} ${split} ${lang}${oracle ? " (oracle)" : ""}: docs ${docs.length}, system mentions ${nMent}, dropped (crossing, off-sentence) ${dropped} -> ${OUT}`);
