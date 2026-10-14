// scene/minds-reading.mjs — THE SAME DISCUSSION, READ BY MORE THAN ONE MIND.  (2026-10-14)
//
//   node eval/the-fold/scene/minds-reading.mjs [--max-sentences 120] [--null-draws 5]
//
// "Let's have it read with multiple minds. One we'll call Kleinian, taking the text as itself. And then we read it also with our
// priors we'll call Zinnian" (the user, 2026-10-14). Two for-whoms over one text, each with its own ground, neither a model:
//
//   KLEINIAN   the ground is the Republic ITSELF and nothing else. A sentence of the discussion is held by the text's own other
//              sentences — what Plato's speakers say elsewhere about the same things — never by an outside voice. The sentence's
//              own Stephanus section is excluded, so the text is not "holding" itself by sitting next to itself.
//   ZINNIAN    the ground is the foundation's voices of the RULED: the formerly enslaved (WPA), the TRC's witnesses, the struggle's
//              own documents — what people who lived under such rule said about it, in the first person, at their addresses.
//
// Each mind holds a sentence or it does not (the consumer's born-null bar: more of the sentence's content words than chance covers
// for words of the same frequency; one word is never evidence). The PAIR is what is read:
//   both         the text's own words and the lived words bear on the sentence — the sign of each is shown (same / opposite)
//   Kleinian only  the text answers itself here; no lived voice in the foundation reaches it
//   Zinnian only   a lived voice reaches a sentence the text never takes up again
//   neither        said so, never filled
// A typed disagreement is a result, not an error: a sentence the text defends against itself (Socrates replying to Thrasymachus) that a
// lived voice corroborates is Plato's own interlocutor being right by the standard of the ruled.
//
// Each mind's rate is read against a null of the same retrieval on queries redrawn from the same vocabulary (so a mind is credited
// only for what the real sentence has that a random one does not).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FOLD = "/Users/mlacy/Documents/3.0/the-fold";
const { indexOf, mindPassagesFor, contentStems } = await import(path.join(FOLD, "fold-chat-foundation.js"));
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const MAXS = Number(opt("--max-sentences", 120)), NULLS = Number(opt("--null-draws", 5));
const ENGLISH = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
const GREEK = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/plato-republic.txt";
const SEED = 20261014;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const bytes = (s) => Buffer.byteLength(s, "utf8");
const NEG = /\b(?:not|never|no|nobody|none|nothing|neither|nor|cannot|without)\b|n['’]t\b/i;

// ── the text, in sections and in sentences with byte addresses ─────────────────────────────────────────────────────────────────
const SLAVE = /\b(slaves?|slavery|enslave\w*|servants?|bondmen|bondman|masters?|bondage)\b/i;
const RULE = /\b(rules?|rulers?|ruling|ruled|laws?|lawgivers?|commands?|obey\w*|obedien\w*|govern\w*|tyrants?|tyranny|authority|subjects?)\b/i;
const eRaw = fs.readFileSync(ENGLISH, "utf8");
const start = eRaw.indexOf("I went down yesterday to the Piraeus");
const marks = []; { const re = /\*(\d{3})([A-Ea-e])?\*/g; re.lastIndex = start; let m, last = 326; while ((m = re.exec(eRaw)) !== null) { const p = Number(m[1]); if (p >= last && p <= 621) { marks.push({ page: p, letter: (m[2] ?? "A").toUpperCase(), idx: m.index, end: m.index + m[0].length }); last = p; } } }
const cleanSpan = (t) => t.replace(/\[Footnote[\s\S]*?\]/g, (x) => " ".repeat(x.length)).replace(/\[Sidenote[\s\S]*?\]/g, (x) => " ".repeat(x.length)).replace(/\{\d+\}/g, (x) => " ".repeat(x.length));
const secs = marks.map((mk, i) => { const stop = i + 1 < marks.length ? marks[i + 1].idx : mk.end + 3000; return { ...mk, stop, text: eRaw.slice(mk.end, stop) }; });
// every sentence of the dialogue with its BYTE address (length-preserving cleaning keeps char offsets true)
const sentences = [];
for (const s of secs) {
  const t = cleanSpan(s.text); const re = /[^.!?]+[.!?]+/g; let m;
  while ((m = re.exec(t)) !== null) { const raw = norm(m[0]); if (raw.length < 25) continue; const at = bytes(eRaw.slice(0, s.end + m.index + (m[0].length - m[0].trimStart().length))); sentences.push({ page: s.page, letter: s.letter, sec: `${s.page}${s.letter}`, text: raw, at, secStart: bytes(eRaw.slice(0, s.idx)), secEnd: bytes(eRaw.slice(0, s.stop)) }); }
}
const hitSecs = new Set(secs.filter((s) => SLAVE.test(s.text) && RULE.test(s.text)).map((s) => `${s.page}${s.letter}`));
let items = sentences.filter((s) => hitSecs.has(s.sec) && (SLAVE.test(s.text) || RULE.test(s.text)));
const total = items.length;
if (items.length > MAXS) { const step = items.length / MAXS; items = Array.from({ length: MAXS }, (_, i) => items[Math.floor(i * step)]); }
console.log(`Republic: ${sentences.length} sentences in ${secs.length} sections · slaves and rules meet in ${hitSecs.size} sections, ${total} sentences speak of them; reading ${items.length}`);

// ── the two grounds ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const load = (f) => { try { const j = JSON.parse(fs.readFileSync(path.join(FOLD, "mind", f), "utf8")); return j.schema === "FoundationIndex@1" ? j : null; } catch { return null; } };
const pub = load("foundation-index.json"), loc = load("foundation-index.local.json");
let all = pub ?? loc; if (pub && loc) { const off = pub.docs.length; all = { ...pub, docs: [...pub.docs, ...loc.docs], units: [...pub.units, ...loc.units.map((u) => [u[0] + off, u[1], u[2]])] }; }
const RULED = new Set(["oral-history-us", "testimony-trc", "testimony"]);
const zinn = indexOf({ ...all, units: all.units.filter((u) => RULED.has(all.docs[u[0]].layer)) });
const klein = indexOf({ schema: "FoundationIndex@1", docs: [{ file: path.basename(ENGLISH), title: "The Republic (Jowett)", layer: "republic", lang: "en", license: "public domain", source: "Plato — The Republic, tr. Jowett" }], units: sentences.map((s) => [0, s.at, s.text]) });
console.log(`KLEINIAN ground: the Republic's own ${sentences.length} sentences · ZINNIAN ground: ${zinn.units.length} sentences of the ruled`);

// THE UNIT. A whole sentence has more content words than any single lived sentence can share, so the bar (correctly) refuses it —
// measured: 0 of 61 for both minds the first time. A sentence is asked of a ground by its RAREST stems in that ground, in pairs and
// triples; it is held if any such query is licensed by the consumer's own bar. Trying many queries can find things by chance, so the
// null runs the SAME procedure on queries redrawn from the same vocabulary, and a mind is credited only for the difference.
const dfOf = (index, t) => (index.postings.get(t) ?? []).length;
const queriesOf = (index, text) => {
  const st = [...new Set(contentStems(text))].filter((t) => dfOf(index, t) >= 2).sort((a, b) => dfOf(index, a) - dfOf(index, b)).slice(0, 6);
  const qs = [];
  for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) { qs.push([st[i], st[j]]); for (let k = j + 1; k < st.length; k++) qs.push([st[i], st[j], st[k]]); }
  return qs;
};
const held = (index, text, exclude) => {
  let best = null;
  for (const q of queriesOf(index, text)) {
    const r = mindPassagesFor({ question: q.join(" "), index, max: 12 });
    const ps = r.passages.filter((p) => !exclude(p));
    if (ps.length && (!best || q.length > best.q.length || (q.length === best.q.length && ps[0].coverage > best.ps[0].coverage))) best = { q, ps: ps.slice(0, 2) };
  }
  return best ? { ps: best.ps, held: true, query: best.q, gap: null } : { ps: [], held: false, query: null, gap: "no query licensed" };
};
const out = items.map((it) => ({
  it,
  k: held(klein, it.text, (p) => p.address.at >= it.secStart),                                  // a LISTENER: only what was said BEFORE this section (Klein: the dialogue is a drama and the reader takes the listener's place)
  kw: held(klein, it.text, (p) => p.address.at >= it.secStart && p.address.at < it.secEnd),     // the whole text, bar its own section (the stronger, Straussian reading: the author as he understood himself)
  z: held(zinn, it.text, () => false),
}));
const nKW = out.filter((x) => x.kw.held).length, nK = out.filter((x) => x.k.held).length, nZ = out.filter((x) => x.z.held).length, nBoth = out.filter((x) => x.k.held && x.z.held).length;
// nulls: queries redrawn from the Republic's own content vocabulary, same length, run through the SAME retrieval and exclusions
const vocab = [...new Set(items.flatMap((x) => contentStems(x.text)))];
let nullK = 0, nullZ = 0, nQ = 0;
for (let d = 0; d < NULLS; d++) for (const it of items) {
  const n = contentStems(it.text).length; if (n < 2) continue; nQ += 1;
  const q = Array.from({ length: n }, () => vocab[Math.floor(rnd() * vocab.length)]).join(" ");
  if (held(klein, q, (p) => p.address.at >= it.secStart).held) nullK += 1;
  if (held(zinn, q, () => false).held) nullZ += 1;
}
const rate = (a, b) => (b ? +(a / b).toFixed(3) : 0);
console.log(`\nof ${items.length} sentences:`);
console.log(`  KLEINIAN (listener: only what came before) holds  ${nK} (${rate(nK, items.length)})   · redrawn-query null ${rate(nullK, nQ)}`);
console.log(`  KLEINIAN, whole text bar its own section        ${nKW} (${rate(nKW, items.length)})`);
console.log(`  ZINNIAN holds   ${nZ} (${rate(nZ, items.length)})   · redrawn-query null ${rate(nullZ, nQ)}`);
console.log(`  both ${nBoth} · Kleinian only ${nK - nBoth} · Zinnian only ${nZ - nBoth} · neither ${items.length - nK - nZ + nBoth}`);

// ── the reading, the pairs, the typed disagreements ───────────────────────────────────────────────────────────────────────────
const sign = (a, b) => (NEG.test(a) === NEG.test(b) ? "same sign" : "opposite sign");
const greekOf = (page, letter) => { const g = fs.readFileSync(GREEK, "utf8"); const mk = `[ ${page}${letter.toLowerCase()} ]`; const i = g.indexOf(mk); if (i < 0) return ""; const j = g.indexOf("[ ", i + mk.length); return norm(g.slice(i + mk.length, j < 0 ? i + 500 : j)).slice(0, 200); };
const kind = (x) => (x.k.held && x.z.held ? "both" : x.k.held ? "Kleinian only" : x.z.held ? "Zinnian only" : "neither");
const lines = [`# The Republic on slaves and rules — read by two minds`, "",
  `> **Standpoint, declared (Zinn: the standpoint is part of the context; neutrality is not on offer).** The Zinnian mind stands with the people who were ruled. Its voices are not everyone's: the WPA narrators were selected and prompted by 1930s interviewers (many white, many from the same county); the TRC testimonies were taken in the commission's own question-and-answer form; the struggle's documents are the struggle's own account. What it holds is what survives in these archives, not what was lived. The Kleinian mind has no standpoint of its own to declare: it is the listener's, the person who has heard only what Plato's speakers have said so far.`, "", `*${items.length} sentences of ${total} from ${hitSecs.size} Stephanus sections, in order.* **Kleinian** takes the text as itself (the Republic's own other sentences, never its own section). **Zinnian** holds the voices of the ruled (${zinn.units.length} sentences: WPA narrators, TRC witnesses, the struggle's documents).`, "", `| | holds | redrawn-query null |`, `|---|---|---|`, `| Kleinian (listener) | ${nK} of ${items.length} | ${rate(nullK, nQ)} |`, `| Kleinian (whole text) | ${nKW} of ${items.length} | — |`, `| Zinnian | ${nZ} of ${items.length} | ${rate(nullZ, nQ)} |`, "", `Both ${nBoth} · Kleinian only ${nK - nBoth} · Zinnian only ${nZ - nBoth} · neither ${items.length - nK - nZ + nBoth}`, ""];
let lastSec = "";
for (const x of out) {
  if (x.it.sec !== lastSec) { lines.push(`## ${x.it.sec}`, `> ${greekOf(x.it.page, x.it.letter)}`, ""); lastSec = x.it.sec; }
  lines.push(`**${kind(x)}** — Plato: ${x.it.text}${NEG.test(x.it.text) ? " _(negated)_" : ""}`);
  if (x.k.query) lines.push(`- _Kleinian asked_ \`${x.k.query.join(" ")}\``);
  for (const p of x.k.ps.slice(0, 1)) lines.push(`- _Kleinian (the text itself, ${path.basename(p.title)} §${sentences.find((s) => s.at === p.address.at)?.sec ?? "?"})_: “${p.text.slice(0, 230)}” — ${sign(p.text, x.it.text)}`);
  if (x.z.query) lines.push(`- _Zinnian asked_ \`${x.z.query.join(" ")}\``);
  for (const p of x.z.ps.slice(0, 1)) lines.push(`- _Zinnian (${p.layer}, ${p.title.slice(0, 50)})_: “${p.text.slice(0, 230)}” — ${sign(p.text, x.it.text)}  \`${p.address.file}#${p.address.at}\``);
  lines.push("");
}
fs.writeFileSync(path.join(HERE, "minds-reading.slaves-and-rules.md"), lines.join("\n"));
const report = { schema: "MindsReading@1", at: new Date().toISOString(), seed: SEED, sections: hitSecs.size, inDiscussion: total, read: items.length,
  kleinian: { ground: `${sentences.length} sentences of the Republic`, mode: "listener", held: nK, rate: rate(nK, items.length), nullRate: rate(nullK, nQ), wholeTextHeld: nKW },
  zinnian: { ground: `${zinn.units.length} sentences of the ruled`, held: nZ, rate: rate(nZ, items.length), nullRate: rate(nullZ, nQ) },
  pair: { both: nBoth, kleinianOnly: nK - nBoth, zinnianOnly: nZ - nBoth, neither: items.length - nK - nZ + nBoth },
  examples: out.filter((x) => x.k.held && x.z.held).slice(0, 8).map((x) => ({ section: x.it.sec, plato: x.it.text, kleinian: x.k.ps[0]?.text, zinnian: x.z.ps[0]?.text, zinnianAddress: x.z.ps[0] ? `${x.z.ps[0].address.file}#${x.z.ps[0].address.at}` : null })) };
fs.writeFileSync(path.join(HERE, "minds-reading.slaves-and-rules.json"), JSON.stringify(report, null, 2) + "\n");
console.log("\nboth minds hold:");
for (const x of out.filter((y) => y.k.held && y.z.held).slice(0, 4)) console.log(`\n ${x.it.sec}  PLATO: ${x.it.text.slice(0, 170)}\n   KLEINIAN: ${x.k.ps[0].text.slice(0, 170)}\n   ZINNIAN [${x.z.ps[0].layer}]: ${x.z.ps[0].text.slice(0, 170)}`);
console.log(`\n→ ${path.join(HERE, "minds-reading.slaves-and-rules.md")}`);
