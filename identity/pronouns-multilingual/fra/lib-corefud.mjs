// lib-corefud.mjs — read a CorefUD conllu (Entity=(e12--2 ... e12) in MISC) into documents of sentences with gold mentions, in the shape eval/referents/pronoun-golden.mjs::parseGum returns:
//   [{ id, sents: [{ text, tokens, mentions: [{ ent, start, end, c0, c1, goldHead: { upos, feats } }] }] }]
// Multiword tokens (au = a + le) take the surface form's character span for their components. One reader; no model.
import fs from "node:fs";
export function parseCorefUD(file) {
  const docs = []; let doc = null, sent = null; const close = () => { if (sent && sent.tokens.length) { finish(sent); doc.sents.push(sent); } sent = null; };
  for (const ln of fs.readFileSync(file, "utf8").split("\n")) {
    if (ln.startsWith("# newdoc")) { close(); doc = { raw0: ln, id: (/id = (.*)$/.exec(ln)?.[1] ?? "doc" + docs.length).trim(), sents: [] }; docs.push(doc); continue; }
    if (!doc) { if (ln.startsWith("#")) (docs.header ??= []).push(ln); continue; } if (ln.startsWith("# text = ")) { sent ??= { tokens: [], text: "", ents: [], lines: [] }; sent.text = ln.slice(9); sent.lines.push(ln); continue; }
    if (ln.startsWith("#")) { (sent ??= { tokens: [], text: "", ents: [], lines: [] }).lines.push(ln); continue; } if (!ln.trim()) { close(); continue; }
    const f = ln.split("\t"); sent ??= { tokens: [], text: "", ents: [], lines: [] }; sent.lines.push(ln);
    if (/^\d+-\d+$/.test(f[0])) { sent.mwt = { from: +f[0].split("-")[0], to: +f[0].split("-")[1], form: f[1] }; continue; }
    if (!/^\d+$/.test(f[0])) continue; const e = /Entity=([^|]*)/.exec(f[9] ?? "");
    sent.tokens.push({ li: sent.lines.length - 1, id: +f[0], form: f[1], upos: f[3], feats: f[5] === "_" ? "" : f[5], head: +f[6], mwt: sent.mwt && +f[0] >= sent.mwt.from && +f[0] <= sent.mwt.to ? { ...sent.mwt } : null }); sent.ents.push(e ? e[1] : "");
  }
  close(); return docs;
}
function finish(s) {
  if (!s.text) s.text = s.tokens.map((t) => t.form).join(" "); let p = 0; const seen = new Map();
  for (const t of s.tokens) { const surf = t.mwt ? t.mwt.form : t.form; const key = t.mwt ? t.mwt.from + ":" + t.mwt.form : null; if (key && seen.has(key)) { [t.start, t.end] = seen.get(key); continue; } const i = s.text.indexOf(surf, p); if (i >= 0) { t.start = i; t.end = i + surf.length; p = t.end; } else { t.start = p; t.end = p; } if (key) seen.set(key, [t.start, t.end]); }
  const open = [], ms = []; const re = /\((e\d+)([^()]*)(\))?|(e\d+)\)/g;
  s.ents.forEach((ev, t) => { let m; re.lastIndex = 0; while ((m = re.exec(ev))) { if (m[1] !== undefined) { if (m[3]) ms.push({ ent: m[1], start: t, end: t }); else open.push({ ent: m[1], start: t }); } else { for (let i = open.length - 1; i >= 0; i--) if (open[i].ent === m[4]) { ms.push({ ent: m[4], start: open[i].start, end: t }); open.splice(i, 1); break; } } } });
  s.mentions = ms.sort((a, b) => a.start - b.start || b.end - a.end).map((m) => { const toks = s.tokens.slice(m.start, m.end + 1), ids = new Set(toks.map((x) => x.id)), head = toks.find((x) => !ids.has(x.head)) ?? toks.at(-1); return { ...m, c0: toks[0].start, c1: toks.at(-1).end, goldHead: { upos: head.upos, feats: head.feats, form: head.form } }; });
  delete s.ents;
}
