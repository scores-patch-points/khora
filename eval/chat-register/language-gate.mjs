// EXPLORATORY. Mechanic 5: what does readerFor() do with real chat? Per message: read as a language with a codec (rows), or a typed gap (no rows, never English by default).
// The 297 human chat logs Zenodotus holds (NUS SMS, CoSEM, Ubuntu/Kubuntu IRC). There is no language gold for them, so this reports where each message goes and prints samples of every
// non-English outcome for a person to read; the judgement of the samples is the reader's (mine, disclosed), not a score.
//   node eval/chat-register/language-gate.mjs [N per source = 2500]    -> eval/chat-register/language-gate.json
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const ZEN = process.env.ZENODOTUS || path.resolve(ROOT, "..", "Zenodotus"), ORG = path.join(ZEN, "19-organic-community");
const N = Number(process.argv[2] || 2500);
const { readerFor } = await import(pathToFileURL(path.join(ROOT, "native", "reading.js")).href);
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex");
const body = (file) => { const t = fs.readFileSync(file, "utf8"); const m = t.match(/^---\n[\s\S]*?\n---\n/); return (m ? t.slice(m[0].length) : t).split("\n"); };   // regex-ok: the front matter of the log file, a file format
const files = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).map((f) => path.join(dir, f));
const IRC = /^<([^>]+)> (.*)$/;   // regex-ok: the IRC log's own line format
const lines = (fs_, irc) => fs_.flatMap((f) => body(f).map((l, i) => { const m = irc ? IRC.exec(l) : null; return irc ? (m ? { f, i, text: m[2].trim() } : null) : { f, i, text: l.trim() }; }).filter(Boolean));
const sources = { sms: lines(files(path.join(ORG, "nus-sms", "en"))), cosem: lines(files(path.join(ORG, "cosem"))), irc: lines(["ubuntu", "kubuntu"].flatMap((d) => files(path.join(ORG, "ubuntu-irc", d))), true) };
const pick = (xs, n) => xs.filter((x) => x.text.length >= 1 && x.text.length <= 280).map((x) => ({ ...x, h: sha(`${path.basename(x.f)}:${x.i}:${x.text}`) })).sort((a, b) => (a.h < b.h ? -1 : 1)).slice(0, n);
const out = {};
for (const [name, items] of Object.entries(sources)) {
  const msgs = pick(items, N), tally = {}, samples = {};
  for (const m of msgs) {
    const r = await readerFor(m.text);
    const key = r.gap ? (r.gap.language ? `gap: ${r.gap.language} (${r.gap.evidence})` : `gap: undetected (${r.gap.evidence}${r.evidence === "none" ? ", nothing to read" : ""})`) : `${r.language} via ${r.evidence}`;
    tally[key] = (tally[key] ?? 0) + 1; (samples[key] ??= []).length < 8 && samples[key].push(m.text.slice(0, 70));
  }
  out[name] = { messages: msgs.length, tally, samples };
  console.log(`\n${name}  ${msgs.length} messages`);
  for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${(100 * n / msgs.length).toFixed(1).padStart(5)}%  ${k}${k.startsWith("eng") ? "" : "   e.g. " + samples[k].slice(0, 5).map((s) => JSON.stringify(s)).join(" | ")}`);
}
fs.writeFileSync(path.join(HERE, "language-gate.json"), JSON.stringify({ stamp: { when: new Date().toISOString(), split: "EXPLORATORY, no language gold; samples are read by a person", perSource: N }, out }, null, 1));
process.exit(0);
