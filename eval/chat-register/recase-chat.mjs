// EXPLORATORY. The recaser on REAL chat, where the gold is not mine: the 297 human chat logs Zenodotus holds (NUS SMS, CoSEM, Ubuntu/Kubuntu IRC), written by people with many accents, schooling and
// habits. Two readings, neither needing a word list of mine:
//   restored   messages in which the WRITER capitalised a word that is not the first of a sentence (and is not "I"): lowercase the message, recase it, and ask whether the writer's own
//              capital comes back. Recall = of the writer's capitalised words, how many come back exactly; precision = of the words recased, how many are a word the writer capitalised. The writer's capital
//              is a proxy for a name (it is also emphasis and shouting), so this is a measure of the behaviour, not of names.
//   lowercase  messages the writer typed with no capital beyond the first word: the recaser's changes are the unchecked ones. Reported per 1000 words, with the words it recases most, so a person can see
//              whether the greetings, endearments and abbreviations of chat are being read as names ("hi", "love", "dear", "ty").
// The table (EWT) and the giver (Wikidata) were never counted from chat, so every message here is held out from them.
//   node eval/chat-register/recase-chat.mjs [N per source = 4000]
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const ZEN = process.env.ZENODOTUS || path.resolve(ROOT, "..", "Zenodotus"), ORG = path.join(ZEN, "19-organic-community");
const N = Number(process.argv[2] || 4000);
const { recaseEnglish } = await import(pathToFileURL(path.join(ROOT, "native", "adapters", "text", "recase.mjs")).href);
const { tokenize } = await import(pathToFileURL(path.join(ROOT, "native", "adapters", "text", "english-parser.js")).href);
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex");
const body = (file) => { const t = fs.readFileSync(file, "utf8"); const m = t.match(/^---\n[\s\S]*?\n---\n/); return (m ? t.slice(m[0].length) : t).split("\n"); };   // regex-ok: the front matter of the log file, a file format
const files = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).map((f) => path.join(dir, f));
const IRC = /^<([^>]+)> (.*)$/;   // regex-ok: the IRC log's own line format
const lines = (fs_, irc) => fs_.flatMap((f) => body(f).map((l, i) => { const m = irc ? IRC.exec(l) : null; return irc ? (m ? { f, i, text: m[2].trim() } : null) : { f, i, text: l.trim() }; }).filter(Boolean));
const sources = {
  sms: lines(files(path.join(ORG, "nus-sms", "en"))), cosem: lines(files(path.join(ORG, "cosem"))),
  irc: lines(["ubuntu", "kubuntu"].flatMap((d) => files(path.join(ORG, "ubuntu-irc", d))), true),
};
const isLetter = (c) => c.toLowerCase() !== c.toUpperCase();
const pick = (xs, n) => xs.filter((x) => x.text.length >= 3 && x.text.length <= 280).map((x) => ({ ...x, h: sha(`${path.basename(x.f)}:${x.i}:${x.text}`) })).sort((a, b) => (a.h < b.h ? -1 : 1)).slice(0, n);
// the writer's capitalised words: not the first word of a sentence, not "I", not shouting (all capitals)
function capitalised(text) { let lead = true; const out = []; for (const t of tokenize(text)) { const f = t.form; if (![...f].some(isLetter)) { if (".?!…".includes(f)) lead = true; continue; } if (!lead && isLetter([...f][0]) && f !== f.toLowerCase() && f !== "I" && f !== f.toUpperCase() && f.length > 1) out.push(f); lead = false; } return out; }
const count = (xs) => { const m = new Map(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
const report = {};
for (const [name, items] of Object.entries(sources)) {
  const msgs = pick(items, N); let want = 0, got = 0, changedRestored = 0, withCaps = 0, lowerWords = 0, lowerChanges = 0, lowerMsgs = 0; const top = new Map(), by = {};
  for (const m of msgs) {
    const caps = capitalised(m.text);
    if (caps.length) {
      withCaps++; want += caps.length; const r = recaseEnglish(m.text.toLowerCase()); const mine = r.changes.filter((c) => c.cased !== "I" && c.cased.length > 1).map((c) => c.cased);
      const w = count(caps), g = count(mine); let hit = 0; for (const [k, c] of w) hit += Math.min(c, g.get(k) ?? 0); got += hit; changedRestored += mine.length;
    } else if (m.text === m.text.toLowerCase() || !caps.length) {
      const toks = tokenize(m.text).filter((t) => [...t.form].some(isLetter)); lowerMsgs++; lowerWords += toks.length;
      const r = recaseEnglish(m.text); for (const c of r.changes) { if (c.cased === "I") continue; lowerChanges++; by[c.by] = (by[c.by] ?? 0) + 1; top.set(`${c.typed}`, (top.get(`${c.typed}`) ?? 0) + 1); }
    }
  }
  report[name] = { messages: msgs.length, writerCapitalised: { messages: withCaps, words: want, recall: +(got / Math.max(1, want)).toFixed(3), precision: +(got / Math.max(1, changedRestored)).toFixed(3) }, lowercase: { messages: lowerMsgs, words: lowerWords, recasedPer1000: +(1000 * lowerChanges / Math.max(1, lowerWords)).toFixed(1), bySource: by, mostRecased: [...top].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => `${k} ${n}`).join(", ") } };
  console.log(name.padEnd(6), JSON.stringify(report[name].writerCapitalised), "\n       lowercase-typed:", JSON.stringify({ messages: lowerMsgs, words: lowerWords, recasedPer1000: report[name].lowercase.recasedPer1000, bySource: by }), "\n       most recased:", report[name].lowercase.mostRecased);
}
fs.writeFileSync(path.join(HERE, "recase-chat.json"), JSON.stringify({ stamp: { when: new Date().toISOString(), split: "EXPLORATORY, held out from the table and the giver", perSource: N }, report }, null, 1));
process.exit(0);
