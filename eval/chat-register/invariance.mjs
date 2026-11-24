// EXPLORATORY. Does the reader read a message the same way when it is typed the way people type it? The invariance needs no gold: the same content,
// perturbed, should give the same referents and the same relations. Variants of each ask (the census asks of 2026-11-23, which I wrote, so this is a
// measurement of the READER's stability, not a claim about real asks; the real ones are in mechanics.mjs):
//   lower     the whole message lowercased                 (how people type on a phone)
//   nopunct   final punctuation removed                    (how people type in a chat box)
//   typo      one adjacent-letter swap in the longest word (deterministic by hash of the message)
// Compared per message on the reader's rows, ignoring punctuation:
//   upos    share of the original's (word, UPOS) pairs that the variant also has (typo: the swapped word is excluded)
//   propn   share of the original's PROPN words that are still PROPN
//   rels    Jaccard of (relation, head word, dependent word) triples
//   same    the message read identically in all three respects
//   node eval/chat-register/invariance.mjs [census.json]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const { rowsOfFor } = await import(pathToFileURL(path.join(ROOT, "native")).href + "/reading.js");
const parser = await rowsOfFor("eng");
const src = process.argv[2] || path.join(HERE, "asks.json");
const asks = [...new Set(JSON.parse(fs.readFileSync(src, "utf8")))].filter((t) => /[a-z]/i.test(t) && t.length > 3);   // regex-ok: a character test on the file's strings
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex");
const words = (rows) => rows.filter((r) => r.upos !== "PUNCT");
const lc = (s) => String(s).toLowerCase();
const variants = {
  lower: (t) => ({ text: t.toLowerCase(), skip: null }),
  nopunct: (t) => ({ text: t.replace(/[.?!]+$/, ""), skip: null }),   // regex-ok: strips the message's final punctuation (surface), not language
  typo: (t) => { const ws = [...t.matchAll(/[A-Za-z]{4,}/g)].sort((a, b) => b[0].length - a[0].length || (sha(t + a.index) < sha(t + b.index) ? -1 : 1)); if (!ws.length) return null; const m = ws[0], i = parseInt(sha(t).slice(0, 4), 16) % (m[0].length - 3) + 1, w = m[0]; const sw = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2); return sw === w ? null : { text: t.slice(0, m.index) + sw + t.slice(m.index + w.length), skip: lc(w), skip2: lc(sw) }; },   // regex-ok: picks the word to perturb
};
const read = (t) => parser.rowsOf(t) ?? [];
const triples = (rows, drop = []) => { const by = new Map(rows.map((r) => [r.id, r])); return new Set(words(rows).filter((r) => r.head !== 0).map((r) => `${r.deprel}|${lc(by.get(r.head)?.form)}|${lc(r.form)}`).filter((t) => !t.split("|").slice(1).some((w) => drop.includes(w)))); };   // a perturbed word is dropped from both sides: the question is whether the REST is read the same
const jac = (a, b) => { if (!a.size && !b.size) return 1; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
const res = {}, ex = {};
for (const [name, make] of Object.entries(variants)) {
  const per = [];
  for (const t of asks) {
    const v = make(t); if (!v || v.text === t) continue;
    const a = read(t), b = read(v.text), wa = words(a).filter((r) => lc(r.form) !== v.skip), wb = words(b).filter((r) => lc(r.form) !== v.skip2);
    const pairs = (ws) => { const m = new Map(); for (const r of ws) { const k = `${lc(r.form)}|${r.upos}`; m.set(k, (m.get(k) ?? 0) + 1); } return m; };
    const pa = pairs(wa), pb = pairs(wb); let hit = 0, tot = 0; for (const [k, n] of pa) { tot += n; hit += Math.min(n, pb.get(k) ?? 0); }
    const na = wa.filter((r) => r.upos === "PROPN").map((r) => lc(r.form)), propnLeft = na.length ? na.filter((w) => wb.some((r) => lc(r.form) === w && r.upos === "PROPN")).length / na.length : null;
    const drop = [v.skip, v.skip2].filter(Boolean), ta = triples(a, drop), tb = triples(b, drop), rels = jac(ta, tb), upos = tot ? hit / tot : 1;
    const same = upos === 1 && (propnLeft ?? 1) === 1 && rels === 1;
    per.push({ t, v: v.text, upos, propn: propnLeft, rels, same });
  }
  const mean = (f, xs = per) => { const v = xs.map(f).filter((x) => x != null); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) : null; };
  res[name] = { messages: per.length, same: +(per.filter((p) => p.same).length / per.length).toFixed(3), upos: mean((p) => p.upos), propn: mean((p) => p.propn), propnMessages: per.filter((p) => p.propn != null).length, rels: mean((p) => p.rels) };
  ex[name] = per.filter((p) => !p.same).sort((a, b) => a.rels - b.rels).slice(0, 8).map((p) => ({ said: p.v, was: p.t, upos: +p.upos.toFixed(2), propn: p.propn, rels: +p.rels.toFixed(2) }));
  console.log(name.padEnd(8), JSON.stringify(res[name]));
}
// control: the same measurement on a variant that changes nothing must give 1 everywhere (the instrument is stable)
const ctl = asks.map((t) => { const a = read(t), b = read(t); return jac(triples(a), triples(b)); }); res.control = { messages: asks.length, rels: +(ctl.reduce((a, b) => a + b, 0) / ctl.length).toFixed(3) }; console.log("control ", JSON.stringify(res.control));
fs.writeFileSync(path.join(HERE, "invariance.json"), JSON.stringify({ stamp: { when: new Date().toISOString(), split: "EXPLORATORY", asks: asks.length, source: path.basename(src) }, results: res, worst: ex }, null, 1));
process.exit(0);
