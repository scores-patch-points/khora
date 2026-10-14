// scene/one-log.mjs — ALL THE MINDS ON ONE LOG, ONLY DISTINCTIONS THAT MAKE A DIFFERENCE, SOURCES BYTE-ADDRESSED.  (2026-10-14)
//
//   node eval/the-fold/scene/one-log.mjs build [--out republic-minds.log.jsonl]
//   node eval/the-fold/scene/one-log.mjs verify [--log republic-minds.log.jsonl]
//
// "All on one log … with DMD recorded not everything, the sources byte addressed to what's meaningful" (the user, 2026-10-14).
// The log is append-only and hash-chained. A source is never copied into it: a span enters ONLY as the evidence of a transformation
// that changed what a later reader would hold, and it enters as an address (`<file>#<byteStart>-<byteEnd>`) plus the sha256 of
// the bytes it names, so `verify` can read the file back and refuse a span that drifted. A record states its mind (strauss =
// the ground, the text as itself; foucault = the genealogist, context that shows the natural contingent; voices = the ruled's own
// testimony; world = the period's own record), its operator (INS a span enters; DEF an issuer is supplied; EVA a claim is
// evaluated against context; REC a dispute is reconciled with both kept; CON two addresses are joined), its giver, and what it
// derives from.
//
// STANDING. Every record is EXPLORATORY: the sublation's DEF/EVA/REC is not above its permuted-matter null (foucault-sublation.json),
// the collision count is not above its label-permutation null (collision-reading.republic.json), and the world links are anchored
// by rigid names and declared status words, not by a reading. The log says so in its header and carries the nulls.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cmd = process.argv[2] ?? "build";
const args = process.argv.slice(3); const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const LOG = path.resolve(HERE, opt("--out", opt("--log", "republic-minds.log.jsonl")));
const ZEN = "/Users/mlacy/Documents/3.0/Zenodotus/";
const ENGLISH = ZEN + "01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
const GREEK = ZEN + "11-multi-language/greek-originals/plato-republic.txt";
const WIKI = ZEN + "25-ancient-world-context/wikipedia/";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const cache = new Map();
const read = (f) => { let v = cache.get(f); if (!v) { const buf = fs.readFileSync(f); v = { buf, str: buf.toString("utf8") }; cache.set(f, v); } return v; };
const byteOf = (f, charIdx) => Buffer.byteLength(read(f).str.slice(0, charIdx), "utf8");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// ── verify ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (cmd === "verify") {
  const lines = fs.readFileSync(LOG, "utf8").split("\n").filter(Boolean); let prev = "0".repeat(64), bad = 0, spans = 0, drift = 0, seen = new Set(), noFile = 0;
  const per = {}; let addressed = 0;
  for (const [i, l] of lines.entries()) {
    const e = JSON.parse(l); if (e.prev !== prev) { bad += 1; console.log(`chain break at seq ${e.seq}`); } prev = sha(l);
    per[`${e.mind}/${e.op}`] = (per[`${e.mind}/${e.op}`] ?? 0) + 1;
    for (const s of [e.span, ...(e.spans ?? [])].filter(Boolean)) {
      spans += 1; if (!fs.existsSync(s.file)) { noFile += 1; continue; }
      const b = read(s.file).buf.subarray(s.byteStart, s.byteEnd);
      if (sha(b) !== s.sha256) drift += 1; const k = `${s.file}#${s.byteStart}-${s.byteEnd}`; if (!seen.has(k)) { seen.add(k); addressed += s.byteEnd - s.byteStart; }
    }
  }
  console.log(`log ${path.basename(LOG)}: ${lines.length} records · chain breaks ${bad} · spans ${spans} (${seen.size} distinct, ${addressed} bytes) · drifted ${drift} · missing files ${noFile}`);
  console.log(`log size ${fs.statSync(LOG).size} bytes`);
  for (const [k, n] of Object.entries(per).sort()) console.log(`  ${k.padEnd(18)} ${n}`);
  const files = [...new Set([...seen].map((k) => k.split("#")[0]))]; const srcBytes = files.reduce((n, f) => n + fs.statSync(f).size, 0);
  console.log(`sources addressed: ${files.length} files, ${srcBytes} bytes; spans name ${addressed} bytes (${(100 * addressed / srcBytes).toFixed(2)}% of them)`);
  process.exit(bad || drift || noFile ? 1 : 0);
}

// ── build ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const locate = (file, text, from = 0) => {                       // verbatim, whitespace-tolerant; the span is the file's own bytes
  const words = norm(text).split(" ").filter(Boolean); if (words.length < 3) return null;
  const { str } = read(file); const m = new RegExp(words.map(esc).join("\\s+")).exec(from ? str.slice(from) : str); if (!m) return null;
  const c0 = m.index + from, c1 = c0 + m[0].length;
  return { file, byteStart: byteOf(file, c0), byteEnd: byteOf(file, c1), sha256: sha(Buffer.from(str.slice(c0, c1), "utf8")), preview: m[0].slice(0, 120).replace(/\s+/g, " ") };
};
const entries = []; let prevHash = "0".repeat(64); const spanSeq = new Map();
// admitted at the low bar; licensed to act only where a null was beaten or the link is by a shared marker
const emit = (e) => { const rec = { seq: entries.length, standing: "exploratory", licensed: false, ...e, prev: prevHash }; const line = JSON.stringify(rec); prevHash = sha(line); entries.push(line); return rec.seq; };
const ins = (mind, giver, span, extra = {}) => {                 // a span enters the log once, as the evidence of something
  const k = `${span.file}#${span.byteStart}-${span.byteEnd}`; if (spanSeq.has(k)) return spanSeq.get(k);
  const s = emit({ mind, op: "INS", giver, span: { file: span.file, byteStart: span.byteStart, byteEnd: span.byteEnd, sha256: span.sha256 }, preview: span.preview, ...extra }); spanSeq.set(k, s); return s;
};

const sub = JSON.parse(fs.readFileSync(path.join(HERE, "foucault-sublation.json"), "utf8"));
const col = JSON.parse(fs.readFileSync(path.join(HERE, "collision-reading.republic.json"), "utf8"));
const lane = JSON.parse(fs.readFileSync(path.join(HERE, "historicity-lane.json"), "utf8"));
emit({ mind: "header", op: "HEADER", schema: "RepublicMindsLog@1", at: new Date().toISOString(), minds: { strauss: "the ground — the text as itself, substance only", foucault: "the genealogist — context that shows the natural contingent", voices: "the ruled's own testimony (WPA, TRC, struggle documents)", world: "the period's own record and the standard background" },
  nulls: { sublation: sub.rows, collision: col.collisionNull, historicity: lane.report },
  caveats: ["every record is exploratory: the sublation is not above its permuted-matter null; the collision count is not above its label-permutation null; the Republic's slave-stem density is not distinguishable from its period at the text level", "world links are anchored by rigid names and declared status words, not read", "matter is a verb lemma; speakers are surface strings", "epochs are declared, approximate"] });

let unlocated = 0;
// 1. the sublation: a Republic frame, the contexts that held its matter, and what was done (DEF / EVA / REC)
for (const r of sub.records) {
  const t = locate(ENGLISH, r.text); if (!t) { unlocated += 1; continue; }
  const ctx = [];
  for (const c of r.contexts) {
    const f = c.witness.replace(/#\d+$/, ""); const file = path.isAbsolute(f) ? f : ZEN + f; if (!fs.existsSync(file)) { unlocated += 1; continue; }
    const s = locate(file, c.text); if (!s) { unlocated += 1; continue; }
    ctx.push({ seq: ins("voices", c.layer, s, { sign: c.sign, issuer: c.issuer }), c });
  }
  if (!ctx.length) continue;
  const tSeq = ins("strauss", "Plato, Republic (Jowett)", t, { stephanus: r.turn, matter: r.matter, sign: r.sign, issuerIn: r.issuerIn });
  for (const o of r.ops) emit({ mind: "foucault", op: o.op, giver: "foucault-sublation.mjs", derivesFrom: [tSeq, ...ctx.map((x) => x.seq)], payload: o.op === "DEF" ? { issuers: o.issuers, matter: r.matter } : o.op === "REC" ? { disputed: o.disputed, altitude: o.altitude, matter: r.matter } : { held: o.held, matter: r.matter } });
}
// 2. the collision: a rule asserted in a main clause where the slave is only backgrounded or patient
for (const c of col.collisionRecords) {
  const rule = locate(ENGLISH, c.rule); if (!rule) { unlocated += 1; continue; }
  const rs = ins("strauss", "Plato, Republic (Jowett)", rule, { stephanus: c.sec, kind: "rule asserted in a main clause" });
  const slaves = [];
  for (const o of c.slave) { const s = locate(ENGLISH, o.sentence); if (s) slaves.push({ seq: ins("foucault", "Plato, Republic (Jowett)", s, { stephanus: c.sec, relation: o.main ? "root" : o.relation, role: o.role }), o }); else unlocated += 1; }
  if (slaves.length) emit({ mind: "foucault", op: "EVA", giver: "collision-reading.mjs", derivesFrom: [rs, ...slaves.map((x) => x.seq)], payload: { finding: "rule asserted, slave only backgrounded or patient", stephanus: c.sec, positions: slaves.map((x) => `${x.o.main ? "root" : x.o.relation}/${x.o.role}`) } });
}
// 3. the Greek counterpart: the Republic's own slave-stems at the same Stephanus section
const gStr = read(GREEK).str; const gMarks = [...gStr.matchAll(/\[ (\d{3})([a-e]) \]/g)].map((m) => ({ sec: `${m[1]}${m[2].toUpperCase()}`, idx: m.index }));
const gSecAt = (idx) => { let r = null; for (const m of gMarks) { if (m.idx <= idx) r = m.sec; else break; } return r; };
const inPlay = new Set(col.inPlaySections);
const eStr = read(ENGLISH).str;
const eSecSentence = new Map();                                    // in-play section → its first slave-word sentence in the English
{
  const start = eStr.indexOf("I went down yesterday to the Piraeus"); const re = /\*(\d{3})([A-Ea-e])?\*/g; re.lastIndex = start; const ms = []; let m, last = 326;
  while ((m = re.exec(eStr)) !== null) { const p = Number(m[1]); if (p >= last && p <= 621) { ms.push({ sec: `${p}${(m[2] ?? "A").toUpperCase()}`, idx: m.index, end: m.index + m[0].length }); last = p; } }
  ms.forEach((mk, i) => { if (!inPlay.has(mk.sec)) return; const body = eStr.slice(mk.end, i + 1 < ms.length ? ms[i + 1].idx : mk.end + 3000); const sm = body.replace(/\{\d+\}/g, " ").match(/[^.!?]*\b(slaves?|slavery|servants?|bondm[ae]n)\b[^.!?]*[.!?]/i); if (sm) eSecSentence.set(mk.sec, { sentence: norm(sm[0]), body }); });
}
const gw = fs.readFileSync(path.join(HERE, "historicity-witnesses.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((w) => w.file === "plato-republic.txt" && w.kind === "slave");
let greekLinks = 0;
for (const w of gw) {
  const byte = Number(w.at.split("#")[1]); const idx = Buffer.from(gStr, "utf8").subarray(0, byte).toString("utf8").length; const sec = gSecAt(idx);
  if (!sec || !eSecSentence.has(sec)) continue;
  const c0 = Math.max(0, idx - 70), c1 = Math.min(gStr.length, idx + 110);
  const gSpan = { file: GREEK, byteStart: byteOf(GREEK, c0), byteEnd: byteOf(GREEK, c1), sha256: sha(Buffer.from(gStr.slice(c0, c1), "utf8")), preview: gStr.slice(c0, c1).replace(/\s+/g, " ").slice(0, 120) };
  const e = locate(ENGLISH, eSecSentence.get(sec).sentence); if (!e) { unlocated += 1; continue; }
  const eSeq = ins("strauss", "Plato, Republic (Jowett)", e, { stephanus: sec, kind: "slave-word sentence" });
  const gSeq = ins("world", "Plato, Republic (Greek, Wikisource)", gSpan, { stephanus: sec, stem: w.stem, epoch: w.epoch });
  emit({ mind: "world", op: "CON", giver: "historicity-lane.mjs", standing: "aligned", licensed: true, basis: "the same Stephanus marker in both texts", derivesFrom: [eSeq, gSeq], payload: { kind: "same Stephanus section, English ↔ Greek", stephanus: sec, stem: w.stem, epoch: w.epoch } }); greekLinks += 1;
}
// 4. the background a course would teach: rigid names → the open background texts, the spans that carry a status word
const ANCHORS = [
  { re: /\bPiraeus\b/, name: "Piraeus", files: ["piraeus.txt", "athenian-democracy.txt"] },
  { re: /\bCephalus\b/, name: "Cephalus", files: ["metic.txt", "republic-plato.txt"] },
  { re: /\bPolemarchus\b/, name: "Polemarchus", files: ["polemarchus.txt", "thirty-tyrants.txt", "metic.txt"] },
  { re: /\bThrasymachus\b/, name: "Thrasymachus", files: ["thrasymachus.txt", "sophist.txt"] },
  { re: /\b(Lacedaemon\w*|Sparta\w*)\b/, name: "Sparta", files: ["helots.txt", "peloponnesian-war.txt"] },
  { re: /\bAthen\w+\b/, name: "Athens", files: ["athenian-democracy.txt", "slavery-in-ancient-greece.txt", "metic.txt"] },
  { re: /\bHellen\w+\b/, name: "Hellenes", files: ["slavery-in-ancient-greece.txt", "barbarian.txt"] },
  { re: /\btyran\w+\b/i, name: "tyranny", files: ["thirty-tyrants.txt", "dionysius-i-of-syracuse.txt"] },
  { re: /\bdemocra\w+\b/i, name: "democracy", files: ["athenian-democracy.txt"] },
  { re: /\bslave\w*\b|\bservant\w*\b/i, name: "slavery", files: ["slavery-in-ancient-greece.txt", "helots.txt", "natural-slavery.txt"] },
];
const STATUS = /\b(slave\w*|metic\w*|citizen\w*|helot\w*|rul\w+|tyrant\w*|democra\w+|oligarch\w+|law\w*|master\w*|owner\w*|free\w*|barbarian\w*|enslave\w*)\b/gi;
const sentSpans = (file) => { const { str } = read(file); return [...str.matchAll(/[^.!?\n][^.!?\n]*[.!?]+/g)].map((m) => ({ text: norm(m[0]), c0: m.index, c1: m.index + m[0].length })).filter((s) => s.text.length >= 40); };
const wikiSpansFor = new Map(); const grouped = new Map();
let worldLinks = 0, secWith = 0;
for (const sec of inPlay) {
  const info = eSecSentence.get(sec); if (!info) continue;
  const anchors = ANCHORS.filter((a) => a.re.test(info.body)); if (!anchors.length) continue; secWith += 1;
  const sentence = locate(ENGLISH, info.sentence); if (!sentence) continue;
  const secSeq = ins("strauss", "Plato, Republic (Jowett)", sentence, { stephanus: sec, kind: "slave-word sentence" });
  for (const a of anchors) for (const f of a.files) {
    const file = WIKI + f; if (!fs.existsSync(file)) continue;
    const key = `${a.name}|${f}`; if (!wikiSpansFor.has(key)) {
      const nameRe = a.re.source.includes("slave") ? null : a.re;
      const scored = sentSpans(file).filter((s) => !nameRe || nameRe.test(s.text)).map((s) => ({ ...s, n: new Set((s.text.match(STATUS) ?? []).map((w) => w.toLowerCase())).size })).filter((s) => s.n > 0).sort((x, y) => y.n - x.n || x.c0 - y.c0).slice(0, 2);
      wikiSpansFor.set(key, scored.map((s) => ({ file, byteStart: byteOf(file, s.c0), byteEnd: byteOf(file, s.c1), sha256: sha(Buffer.from(read(file).str.slice(s.c0, s.c1), "utf8")), preview: s.text.slice(0, 120), statusWords: s.n })));
    }
    for (const sp of wikiSpansFor.get(key)) {
      const wSeq = ins("world", `Wikipedia: ${f.replace(/\.txt$/, "")} (CC BY-SA 4.0)`, sp, { anchor: a.name });
      const g = grouped.get(wSeq) ?? { anchor: a.name, statusWords: sp.statusWords, secs: new Set(), seqs: new Set() }; g.secs.add(sec); g.seqs.add(secSeq); grouped.set(wSeq, g);
    }
  }
}
for (const [wSeq, g] of grouped) { emit({ mind: "world", op: "CON", giver: "one-log.mjs", derivesFrom: [wSeq, ...g.seqs], payload: { kind: "rigid-name or declared term anchor, one record per background span", anchor: g.anchor, stephanus: [...g.secs], statusWords: g.statusWords } }); worldLinks += 1; }
fs.writeFileSync(LOG, entries.join("\n") + "\n");
console.log(`log → ${LOG}: ${entries.length} records · unlocated (not logged, not verifiable) ${unlocated} · Greek↔English links ${greekLinks} · world anchors on ${secWith} sections, ${worldLinks} links`);
