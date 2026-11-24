// EXPLORATORY (no preregistration, no held-out split; every number below is a descriptive count or an agreement rate, never a threshold).
// WHAT MECHANICS DOES REAL CHAT NEED? The 297 human chat-log documents Zenodotus already holds (19-organic-community: NUS SMS, CoSEM, Ubuntu/Kubuntu
// IRC) are read through khora's reader and sorted by what the reader's own marks say a message is DOING. Then the chat is asked, offline, what it does
// with an example of each kind. Nothing here is a word list: the kinds come from the marks (mood, person, PronType, polarity, INTJ, vocative, whether
// there is a verb). The English reader is the parameter; a language with no codec would be a typed gap.
//   node eval/chat-register/mechanics.mjs [N per source = 1200]   -> eval/chat-register/mechanics.json
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ZEN = process.env.ZENODOTUS || path.resolve(ROOT, "..", "Zenodotus");
const ORG = path.join(ZEN, "19-organic-community");
const N = Number(process.argv[2] || 1200);
const K = pathToFileURL(path.join(ROOT, "native") + "/").href;
const { rowsOfFor } = await import(K + "reading.js");
const { priorsFor } = await import(K + "the-fold/read-core.mjs");
const { classifyWord } = await import(K + "adapters/text/wordclass.js");
const { splitSentences } = await import(K + "adapters/text/spans.js");
const parser = await rowsOfFor("eng"), pr = priorsFor("eng");
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex");
const feats = (r) => Object.fromEntries(String(r.feats ?? "").split("|").filter((x) => x.includes("=")).map((x) => x.split("=")));

// ---- 1. the material: a message is a line of the log (IRC: the line after "<nick> "), sampled by hash so the sample does not depend on who picks
const body = (file) => { const t = fs.readFileSync(file, "utf8"); const m = t.match(/^---\n[\s\S]*?\n---\n/); return (m ? t.slice(m[0].length) : t).split("\n"); };
const files = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).map((f) => path.join(dir, f));
const IRC = /^<([^>]+)> (.*)$/;   // regex-ok: the IRC log's own line format (a file format, not language)
const sources = {
  sms: { label: "NUS SMS (en)", items: files(path.join(ORG, "nus-sms", "en")).flatMap((f) => body(f).map((l, i) => ({ f, i, text: l.trim() }))) },
  cosem: { label: "CoSEM (Singapore English messages)", items: files(path.join(ORG, "cosem")).flatMap((f) => body(f).map((l, i) => ({ f, i, text: l.trim() }))) },
  irc: { label: "Ubuntu + Kubuntu IRC (en)", items: ["ubuntu", "kubuntu"].flatMap((d) => files(path.join(ORG, "ubuntu-irc", d))).flatMap((f) => body(f).map((l, i) => { const m = IRC.exec(l); return m ? { f, i, nick: m[1], text: m[2].trim() } : null; }).filter(Boolean)) },
};
const formalFile = path.join(ZEN, "01-literature-books", "gutenberg", "pg11_Alice_s_Adventures_in_Wonderland.txt");
const formalText = fs.readFileSync(formalFile, "utf8");
sources.formal = { label: "Alice in Wonderland (formal control)", items: splitSentences(formalText.slice(formalText.indexOf("CHAPTER I.")), { abbreviations: new Set() }).map((c, i) => ({ f: formalFile, i, text: c.text.replace(/\s+/g, " ").trim() })) };
const pick = (items, n) => items.filter((x) => x.text.length >= 2 && x.text.length <= 280).map((x) => ({ ...x, h: sha(`${path.basename(x.f)}:${x.i}:${x.text}`) })).sort((a, b) => (a.h < b.h ? -1 : 1)).slice(0, n);

// ---- 2. what a message is doing, from the reader's marks
const NONWORD = new Set(["PUNCT", "SYM", "X", "NUM"]);
const known = (w) => { const c = classifyWord(String(w).toLowerCase(), { posPrior: pr.posPrior }); return !!c?.found && c.total > 0; };
function read(text) {
  const rows = parser.rowsOf(text) ?? [], toks = rows.filter((r) => r.upos !== "PUNCT"), words = toks.filter((r) => !NONWORD.has(r.upos));
  const root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT") ?? null, rf = root ? feats(root) : {};
  const subj = root && rows.find((r) => r.head === root.id && /^nsubj/.test(r.deprel)), sf = subj ? feats(subj) : {};   // regex-ok: a UD label
  const hasVerb = rows.some((r) => r.upos === "VERB" || r.upos === "AUX"), wh = rows.some((r) => feats(r).PronType === "Int");
  const q = rows.at(-1)?.form === "?" || wh;
  const imp = !!root && root.upos === "VERB" && (rf.Mood === "Imp" || rf.VerbForm === "Inf") && !subj;
  const intj = toks.length > 0 && toks.every((r) => r.upos === "INTJ");
  const act = !toks.length ? "empty" : intj ? "interjection" : q ? "question" : imp ? "imperative" : !hasVerb ? "fragment" : "statement";
  const person = act === "statement" || act === "question" ? (sf.Person ?? (subj ? "noun" : "none")) : "-";
  return { rows, act, person, addressed: rows.some((r) => r.deprel === "vocative"), neg: rows.some((r) => feats(r).Polarity === "Neg"), propn: toks.filter((r) => r.upos === "PROPN").length, lowerPropn: toks.filter((r) => r.upos === "PROPN" && r.form === r.form.toLowerCase()).length,
    words: words.length, oov: words.filter((r) => !known(r.form)).length, nonword: toks.filter((r) => r.upos === "SYM" || r.upos === "X").length, startsLower: /^[a-z]/.test(text), endsPunct: /[.!?]$/.test(text) };   // regex-ok: a character-class test of the message's surface (register), not its meaning
}
const out = { stamp: { when: new Date().toISOString(), split: "EXPLORATORY", n: N, zenodotus: ZEN, files: Object.fromEntries(Object.entries(sources).map(([k, s]) => [k, new Set(s.items.map((x) => x.f)).size])), messages: Object.fromEntries(Object.entries(sources).map(([k, s]) => [k, s.items.length])) }, register: {}, mechanics: {}, conversation: {}, examples: {} };
const sig = (m) => `${m.act}${m.person !== "-" ? `/${m.person === "1" ? "I" : m.person === "2" ? "you" : m.person === "3" ? "it" : m.person}` : ""}${m.addressed ? "+addressed" : ""}${m.neg ? "+neg" : ""}`;
const picked = {};
for (const [k, s] of Object.entries(sources)) {
  const t0 = Date.now(), sample = pick(s.items, N), rs = sample.map((x) => ({ x, m: read(x.text) }));
  picked[k] = rs;
  const sum = (f) => rs.reduce((a, { m }) => a + f(m), 0), words = sum((m) => m.words), n = rs.length;
  out.register[k] = { label: s.label, sampled: n, tokensPerMessage: +(sum((m) => m.rows.filter((r) => r.upos !== "PUNCT").length) / n).toFixed(2), oovShare: +(sum((m) => m.oov) / words).toFixed(3), startsLowercase: +(sum((m) => (m.startsLower ? 1 : 0)) / n).toFixed(3), endsWithPunct: +(sum((m) => (m.endsPunct ? 1 : 0)) / n).toFixed(3), noVerb: +(sum((m) => (m.act === "fragment" ? 1 : 0)) / n).toFixed(3), propnPerMessage: +(sum((m) => m.propn) / n).toFixed(3), lowercasePropnShare: +(sum((m) => m.lowerPropn) / Math.max(1, sum((m) => m.propn))).toFixed(3), emoticonOrOther: +(sum((m) => (m.nonword ? 1 : 0)) / n).toFixed(3), ms: Date.now() - t0 };
  const by = new Map(); for (const { x, m } of rs) { const g = sig(m); const e = by.get(g) ?? { sig: g, n: 0, ex: [] }; e.n++; if (e.ex.length < 4) e.ex.push(x.text.slice(0, 110)); by.set(g, e); }
  out.mechanics[k] = [...by.values()].sort((a, b) => b.n - a.n).map((e) => ({ ...e, share: +(e.n / n).toFixed(3) }));
  console.log(`${k}: ${n} messages read in ${((Date.now() - t0) / 1000).toFixed(1)} s; ${out.mechanics[k].length} kinds; top: ${out.mechanics[k].slice(0, 5).map((e) => `${e.sig} ${(e.share * 100).toFixed(0)}%`).join(", ")}`);
}

// ---- 3. conversation mechanics (IRC only: it carries who spoke), from the log's own structure, no parsing
const conv = { lines: 0, addressed: 0, gaps: [], qs: 0, qAnswered: 0, qAddressedAnswered: 0, qAddressed: 0, selfRuns: 0 };
const byFile = new Map(); for (const x of sources.irc.items) { const a = byFile.get(x.f) ?? []; a.push(x); byFile.set(x.f, a); }
for (const lines of byFile.values()) {
  const nicks = new Set(lines.map((l) => l.nick)), last = new Map();
  lines.forEach((l, i) => {
    conv.lines++;
    const m = /^([^\s:,]+)[:,]\s/.exec(l.text), to = m && nicks.has(m[1]) && m[1] !== l.nick ? m[1] : null;   // regex-ok: the IRC address convention "nick: ", with nick drawn from this log's own speakers
    if (to) { conv.addressed++; if (last.has(to)) conv.gaps.push(i - last.get(to)); }
    if (l.text.endsWith("?")) { conv.qs++; const nxt = lines.slice(i + 1, i + 6).find((y) => y.nick !== l.nick); if (nxt) { conv.qAnswered++; if (to) { conv.qAddressed++; if (lines.slice(i + 1, i + 6).some((y) => y.nick === to)) conv.qAddressedAnswered++; } } }
    if (i && lines[i - 1].nick === l.nick) conv.selfRuns++;
    last.set(l.nick, i);
  });
}
const qs = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
out.conversation = { lines: conv.lines, addressedShare: +(conv.addressed / conv.lines).toFixed(3), gapToAddresseesLastLine: { n: conv.gaps.length, median: qs(conv.gaps, 0.5), p90: qs(conv.gaps, 0.9) }, questionLines: conv.qs, questionsFollowedByAnotherSpeakerWithin5: +(conv.qAnswered / Math.max(1, conv.qs)).toFixed(3), addressedQuestionsAnsweredByAddresseeWithin5: +(conv.qAddressedAnswered / Math.max(1, conv.qAddressed)).toFixed(3), sameSpeakerRunShare: +(conv.selfRuns / conv.lines).toFixed(3) };
console.log("conversation:", JSON.stringify(out.conversation));

// ---- 4. the chat, offline, on examples of each kind (no givers, no janus): what does it DO with them?
const { makeThread } = await import(K + "../native/chat/thread.mjs");
const kinds = new Map();
for (const k of ["sms", "cosem", "irc"]) for (const e of out.mechanics[k]) { const a = kinds.get(e.sig) ?? { sig: e.sig, n: 0, ex: [] }; a.n += e.n; for (const t of e.ex) if (a.ex.length < 3 && t.length > 3) a.ex.push(t); kinds.set(e.sig, a); }
const total = [...kinds.values()].reduce((a, e) => a + e.n, 0);
out.chatBehaviour = [];
for (const e of [...kinds.values()].sort((a, b) => b.n - a.n).slice(0, 22)) {
  const rec = { sig: e.sig, share: +(e.n / total).toFixed(3), replies: [] };
  for (const t of e.ex.slice(0, 2)) { try { const urls = [], getJson = async (u) => { urls.push(u); return {}; };   // the network is a counting stub: no rate limits, and "did it go looking?" is a number (doorCalls)
    const th = await makeThread({ hl: "http://127.0.0.1:1", know: { person: async () => null, lookup: async () => ({ primary: null }) }, janus: null, log: null, getJson }); const r = await Promise.race([th.turn(t), new Promise((_, j) => setTimeout(() => j(new Error("timeout")), 20000))]); rec.replies.push({ said: t.slice(0, 90), type: r?.type ?? null, handled: r?.handled ?? null, gap: r?.gap ?? null, doorCalls: urls.length, text: String(r?.text ?? "").slice(0, 100) }); } catch (err) { rec.replies.push({ said: t.slice(0, 90), error: String(err?.message ?? err).slice(0, 80) }); } }
  out.chatBehaviour.push(rec); console.log(`${e.sig.padEnd(24)} ${(rec.share * 100).toFixed(1).padStart(5)}%  ${rec.replies.map((r) => `${r.type ?? "ERR"}${r.handled === false ? "(gap)" : ""}`).join(", ")}`);
}
fs.writeFileSync(path.join(HERE, "mechanics.json"), JSON.stringify(out, null, 1));
process.exit(0);
