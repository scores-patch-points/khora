// EXPLORATORY. What does it buy the chat to DECLARE what a message is (native/chat/acts.mjs: marks -> claims -> one judge rule, ambiguity kept open, nothing
// holding = unread), instead of routing in passing? The declaration is a thing that can be measured, which a router's passing decision is not. Three questions,
// asked of the act layer's own pure functions (marksOf, candidates, judge) over the same real chat sample (hash-picked from the 297 Zenodotus chat logs) and a
// formal control, reading only the reader's universal marks. The few English-only booleans the thread hands the layer (small-talk table, arithmetic, slash,
// leading address) are NOT supplied here, so this is the declaration from marks alone, a lower bound on what the thread declares.
//   1. THE PROFILE   what it declares on real chat: working act, how often it admits two acts hold (open), how often a mark opposes a claim, how often nothing holds.
//   2. THE REASON    each declaration names the marks it rests on, so its fragility can be PREDICTED: perturb a message (all lowercase, final punctuation off, one
//                    letter swapped) and ask whether the working act survives, split by how many independent marks supported it.
//   3. THE LEDGER    the same two perturbations on the reader alone gave "read identically" 17% (lowercase) and 83% (no final mark): how often does the DECLARATION
//                    survive, where the reading underneath it did not?
//   node eval/chat-register/declarations.mjs [N per source = 600]   -> declarations.json
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const ZEN = process.env.ZENODOTUS || path.resolve(ROOT, "..", "Zenodotus"), ORG = path.join(ZEN, "19-organic-community");
const N = Number(process.argv[2] || 600), K = pathToFileURL(path.join(ROOT, "native") + "/").href;
const { rowsOfFor } = await import(K + "reading.js");
const { splitSentences } = await import(K + "adapters/text/spans.js");
const { marksOf, candidates, judge } = await import(K + "chat/acts.mjs");
const parser = await rowsOfFor("eng"), sha = (s) => crypto.createHash("sha1").update(s).digest("hex");
const feats = (r) => Object.fromEntries(String(r.feats ?? "").split("|").filter((x) => x.includes("=")).map((x) => x.split("=")));
// ---- the same sample as mechanics.mjs (same hash, same files)
const body = (file) => { const t = fs.readFileSync(file, "utf8"); const m = t.match(/^---\n[\s\S]*?\n---\n/); return (m ? t.slice(m[0].length) : t).split("\n"); };   // regex-ok: frontmatter of a file
const files = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).map((f) => path.join(dir, f));
const IRC = /^<([^>]+)> (.*)$/;   // regex-ok: the IRC log's line format
const sources = {
  sms: files(path.join(ORG, "nus-sms", "en")).flatMap((f) => body(f).map((l, i) => ({ f, i, text: l.trim() }))),
  cosem: files(path.join(ORG, "cosem")).flatMap((f) => body(f).map((l, i) => ({ f, i, text: l.trim() }))),
  irc: ["ubuntu", "kubuntu"].flatMap((d) => files(path.join(ORG, "ubuntu-irc", d))).flatMap((f) => body(f).map((l, i) => { const m = IRC.exec(l); return m ? { f, i, text: m[2].trim() } : null; }).filter(Boolean)),
};
const formalFile = path.join(ZEN, "01-literature-books", "gutenberg", "pg11_Alice_s_Adventures_in_Wonderland.txt"), ft = fs.readFileSync(formalFile, "utf8");
sources.formal = splitSentences(ft.slice(ft.indexOf("CHAPTER I.")), { abbreviations: new Set() }).map((c, i) => ({ f: formalFile, i, text: c.text.replace(/\s+/g, " ").trim() }));
const pick = (items, n) => items.filter((x) => x.text.length >= 2 && x.text.length <= 280).map((x) => ({ ...x, h: sha(`${path.basename(x.f)}:${x.i}:${x.text}`) })).sort((a, b) => (a.h < b.h ? -1 : 1)).slice(0, n);
// ---- the declaration from marks alone
function declare(text) {
  const rows = parser.rowsOf(text) ?? [], root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT"), rf = root ? feats(root) : {};
  const subj = root && rows.some((r) => r.head === root.id && /^nsubj/.test(r.deprel));   // regex-ok: a UD label
  const ctx = { wh: rows.some((r) => feats(r).PronType === "Int"), request: !!root && root.upos === "VERB" && (rf.Mood === "Imp" || rf.VerbForm === "Inf") && !subj };
  const marks = marksOf(rows, ctx), cands = candidates(marks), j = judge(cands), w = cands.find((c) => c.act === j.working);
  return { working: j.working, open: j.open, alternatives: j.alternatives, support: w ? w.for.length : 0, supportMarks: w ? w.for : [], refuted: j.claims.filter((c) => c.standing === "refuted").length, marks: Object.keys(marks) };
}
const variants = {
  lower: (t) => t.toLowerCase(),
  nopunct: (t) => t.replace(/[.?!]+$/, ""),   // regex-ok: final punctuation of the message (surface)
  typo: (t) => { const ws = [...t.matchAll(/[A-Za-z]{4,}/g)].sort((a, b) => b[0].length - a[0].length || (sha(t + a.index) < sha(t + b.index) ? -1 : 1)); if (!ws.length) return t; const m = ws[0], w = m[0], i = parseInt(sha(t).slice(0, 4), 16) % (w.length - 3) + 1, sw = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2); return t.slice(0, m.index) + sw + t.slice(m.index + w.length); },   // regex-ok: picks the word to perturb
};
const out = { stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: "EXPLORATORY", n: N, note: "declaration from the reader's universal marks only; the thread's English-supplied booleans (small talk, arithmetic, slash, address) are not given" }, profile: {}, stability: {}, bySupport: {}, ledger: {} };
const pooled = []; const t0 = Date.now();
for (const [k, items] of Object.entries(sources)) {
  const sample = pick(items, N), rs = sample.map((x) => ({ x, d: declare(x.text) })), n = rs.length, share = (f) => +(rs.filter(f).length / n).toFixed(3);
  const acts = {}; for (const { d } of rs) acts[d.working] = (acts[d.working] ?? 0) + 1;
  const pairs = {}; for (const { d } of rs) if (d.open) { const key = [d.working, ...d.alternatives].join("+"); pairs[key] = (pairs[key] ?? 0) + 1; }
  out.profile[k] = { sampled: n, working: Object.fromEntries(Object.entries(acts).sort((a, b) => b[1] - a[1]).map(([a, c]) => [a, +(c / n).toFixed(3)])), open: share((r) => r.d.open), unread: share((r) => r.d.working === "unread"), someMarkOpposes: share((r) => r.d.refuted > 0), openPairs: Object.fromEntries(Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 5)) };
  for (const [vn, vf] of Object.entries(variants)) {
    let same = 0, sameOpen = 0, cmp = 0;
    for (const { x, d } of rs) { const t2 = vf(x.text); if (t2 === x.text) continue; const d2 = declare(t2); cmp++; if (d2.working === d.working) same++; if (d2.working === d.working && d2.open === d.open) sameOpen++; if (d.working !== "unread") pooled.push({ src: k, v: vn, support: d.support, open: d.open, same: d2.working === d.working, marks: d.supportMarks }); }
    (out.stability[k] ??= {})[vn] = { changed: cmp, sameWorkingAct: +(same / Math.max(1, cmp)).toFixed(3), sameWorkingActAndOpen: +(sameOpen / Math.max(1, cmp)).toFixed(3) };
  }
  console.log(`${k}: ${n} messages; working ${JSON.stringify(out.profile[k].working)}; open ${(out.profile[k].open * 100).toFixed(1)}%, unread ${(out.profile[k].unread * 100).toFixed(1)}%, a mark opposes a claim ${(out.profile[k].someMarkOpposes * 100).toFixed(1)}%  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
// ---- 2. the reason: survival of the working act by how many marks supported it, pooled over real chat (not the formal control) and the three perturbations
for (const v of ["lower", "nopunct", "typo", "all"]) {
  const rows = pooled.filter((p) => p.src !== "formal" && (v === "all" || p.v === v)), by = {};
  for (const p of rows) { const key = p.support >= 3 ? "3+" : String(p.support); const e = (by[key] ??= { n: 0, same: 0 }); e.n++; if (p.same) e.same++; }
  out.bySupport[v] = Object.fromEntries(Object.entries(by).sort().map(([s, e]) => [`${s} mark${s === "1" ? "" : "s"}`, { n: e.n, survives: +(e.same / e.n).toFixed(3) }]));
  console.log(`survival of the working act, by how many marks supported it (${v}, real chat): ${JSON.stringify(out.bySupport[v])}`);
}
const byOpen = {}; for (const p of pooled.filter((q) => q.src !== "formal")) { const key = p.open ? "open (two acts held)" : "closed"; const e = (byOpen[key] ??= { n: 0, same: 0 }); e.n++; if (p.same) e.same++; }
out.bySupport.byOpen = Object.fromEntries(Object.entries(byOpen).map(([k, e]) => [k, { n: e.n, survives: +(e.same / e.n).toFixed(3) }])); console.log(`survival, open vs closed declarations: ${JSON.stringify(out.bySupport.byOpen)}`);
// which single mark is the fragile one
const byMark = {}; for (const p of pooled.filter((q) => q.src !== "formal" && q.support === 1)) { const key = p.marks[0] ?? "-"; const e = (byMark[key] ??= { n: 0, same: 0 }); e.n++; if (p.same) e.same++; }
out.bySupport.singleMark = Object.fromEntries(Object.entries(byMark).sort((a, b) => b[1].n - a[1].n).map(([k, e]) => [k, { n: e.n, survives: +(e.same / e.n).toFixed(3) }])); console.log(`when ONE mark supports the act, which mark: ${JSON.stringify(out.bySupport.singleMark)}`);
// ---- 3. the ledger against the reader alone (56 developer-written asks, perturbed the same three ways)
const asks = JSON.parse(fs.readFileSync(path.join(HERE, "asks.json"), "utf8")).filter((t) => /[a-z]/i.test(t) && t.length > 3);   // regex-ok: a character test on file strings
for (const [vn, vf] of Object.entries(variants)) { let c = 0, s = 0; for (const t of asks) { const t2 = vf(t); if (t2 === t) continue; c++; if (declare(t).working === declare(t2).working) s++; } out.ledger[vn] = { messages: c, declarationSurvives: +(s / c).toFixed(3) }; }
console.log("the declaration on the 56 asks, perturbed:", JSON.stringify(out.ledger), "(the reader alone read these identically: lowercase 17%, no final mark 83%, typo 90%)");
fs.writeFileSync(path.join(HERE, "declarations.json"), JSON.stringify(out, null, 1));
process.exit(0);
