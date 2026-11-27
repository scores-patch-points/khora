// EXPLORATORY (the rules and the window were fixed before the run; DEV sets only: CorefUD 1.3 English GUM dev and LitBank dev). THE OWNER, 2026-11-24: reading "Casey met Jordan. She smiled." a person assumes
// CASEY smiled, because the subject's role continues: the earlier sentence leaves an ACTIVATION on its referents (a trace, stigmergy), and the next sentence is read against it; and "when we cut between shots,
// our minds connect the relationships even if that was not the original intent" (Eisenstein's montage; Kuleshov): adjacency alone makes the connection. The chat asks "Do you mean Casey or Jordan?"
// instead. Question: when a he / she has two or more named candidates that the given-name prior does not rule out, which simple activation rule binds it right, and how often? The chat's situation, exactly:
// candidates are the named persons (gold entities of type person with a proper-noun mention) in the window (the sentence so far and the one before), minus those the given-name prior says are the other gender.
// Rules (none has a weight or a threshold): SUBJECT = the nearest earlier sentence that holds a candidate: its grammatical subject if a candidate is one, else its first candidate; RECENT = the latest mention;
// FIRST = the earliest mention in the window; COUNT = the most mentions in the window (ties to the latest). Reference: the expected rate of a random pick among the candidates. Right = the pronoun's gold entity.
//   node eval/chat-register/activation-binding.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const DATA = process.env.COREFUD_DIR ?? "/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data";
const SETS = { "GUM dev": `${DATA}/CorefUD_English-GUM/en_gum-corefud-dev.conllu`, "LitBank dev": `${DATA}/CorefUD_English-LitBank/en_litbank-corefud-dev.conllu` };
const { makeDefaultNameGenderPrior } = await import("file://" + ROOT + "/native/adapters/text/gender-of-words.js"), P = makeDefaultNameGenderPrior({});
const HE = new Set(["he", "him", "his", "himself"]), SHE = new Set(["she", "her", "hers", "herself"]);
const wilson = (k, n) => { if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+((c - m) / d).toFixed(2), +((c + m) / d).toFixed(2)]; };
function parse(file) {
  const docs = []; let doc = null, sent = null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# newdoc")) { doc = { sents: [] }; docs.push(doc); continue; } if (line === "") { sent = null; continue; } if (line.startsWith("#")) continue;
    const c = line.split("\t"); if (!/^\d+$/.test(c[0])) continue;   // regex-ok: a CoNLL-U token id, not language
    if (!sent) { sent = { toks: [], mentions: [], stack: [] }; (doc ?? (doc = { sents: [] }, docs.push(doc))).sents.push(sent); }
    const t = { i: sent.toks.length, form: c[1], upos: c[3], deprel: c[7] }; sent.toks.push(t); const ent = (c[9].split("|").find((x) => x.startsWith("Entity=")) ?? "").slice(7);
    for (let k = 0; k < ent.length;) { if (ent[k] === "(") { let j = k + 1; while (j < ent.length && ent[j] !== "(" && ent[j] !== ")") j++; const [id, type] = ent.slice(k + 1, j).split("-"); sent.stack.push({ id, type, start: t.i }); k = j; } else if (ent[k] === ")") { const m = sent.stack.pop(); if (m) sent.mentions.push({ ...m, end: t.i }); k++; } else k++; }
  }
  return docs;
}
const RULES = { "subject of the nearest earlier sentence": (c) => c.bySubject, "most recent mention": (c) => c.recent, "first mention in the window": (c) => c.first, "most mentions (ties to the latest)": (c) => c.most };
function run(docs, N) {
  const T = { he: { n: 0, random: 0, rules: Object.fromEntries(Object.keys(RULES).map((k) => [k, 0])) }, she: { n: 0, random: 0, rules: Object.fromEntries(Object.keys(RULES).map((k) => [k, 0])) } }; let before = 0;
  for (const d of docs) for (let si = 0; si < d.sents.length; si++) { const s = d.sents[si];
    for (const m of s.mentions) { if (m.start !== m.end) continue; const t = s.toks[m.start]; if (t.upos !== "PRON") continue; const w = t.form.toLowerCase(), kind = HE.has(w) ? "he" : SHE.has(w) ? "she" : null; if (!kind) continue; const want = kind === "he" ? "m" : "f";
      const cand = new Map();   // id -> { id, name words, mentions: [{ sj, at, subj }] }
      for (let sj = Math.max(0, si - N + 1); sj <= si; sj++) for (const mm of d.sents[sj].mentions) { if (mm.type !== "person") continue; if (sj === si && mm.end >= m.start) continue; const toks = d.sents[sj].toks.slice(mm.start, mm.end + 1); if (!toks.some((x) => x.upos === "PROPN")) continue;
        const name = toks.filter((x) => x.upos === "PROPN").map((x) => x.form), head = toks.find((x) => x.deprel !== "flat" && x.deprel !== "compound") ?? toks[0], rec = cand.get(mm.id) ?? cand.set(mm.id, { id: mm.id, names: [], ms: [] }).get(mm.id); rec.names = name; rec.ms.push({ sj, at: mm.start, subj: /^nsubj/.test(head.deprel) }); }   // regex-ok: a UD relation label
      if (cand.size >= 2) before++;
      const ok = [...cand.values()].filter((c) => { const g = P.explain(c.names).gender; return g === null || g === want; }); if (ok.length < 2) continue;   // the chat's situation: still ambiguous after the prior
      const T1 = T[kind]; T1.n++; T1.random += 1 / ok.length;
      const all = ok.flatMap((c) => c.ms.map((x) => ({ ...x, id: c.id }))).sort((a, b) => a.sj - b.sj || a.at - b.at), lastS = Math.max(...all.map((x) => x.sj));
      const earlier = all.filter((x) => x.sj < si).length ? Math.max(...all.filter((x) => x.sj < si).map((x) => x.sj)) : lastS, inS = all.filter((x) => x.sj === earlier);
      const picks = { bySubject: (inS.find((x) => x.subj) ?? inS[0]).id, recent: all[all.length - 1].id, first: all[0].id, most: [...ok].sort((a, b) => b.ms.length - a.ms.length || Math.max(...b.ms.map((x) => x.sj * 1000 + x.at)) - Math.max(...a.ms.map((x) => x.sj * 1000 + x.at)))[0].id };
      for (const [rn, f] of Object.entries(RULES)) if (f(picks) === m.id) T1.rules[rn]++; } }
  return { T, before };
}
const out = { stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: "EXPLORATORY (DEV: CorefUD 1.3 English GUM dev, LitBank dev; rules and N = 2 fixed before the run; N = 1 and 3 reported)", commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })() }, results: {} };
for (const [name, file] of Object.entries(SETS)) { const docs = parse(file); out.results[name] = {};
  for (const N of [1, 2, 3]) { const { T, before } = run(docs, N); out.results[name][`N${N}`] = { T, twoOrMoreCandidatesBeforeTheGenderPrior: before };
    console.log(`${name}, window N=${N} (he/she with two or more candidates the given-name prior leaves open; ${before} had two or more before the prior):`);
    for (const k of ["he", "she"]) { const x = T[k]; if (!x.n) { console.log(`   ${k}: none`); continue; } console.log(`   ${k}: ${x.n} cases; a random pick would be right ${(100 * x.random / x.n).toFixed(0)}%; ${Object.entries(x.rules).map(([r, v]) => `${r} ${v} (${Math.round(100 * v / x.n)}% ${JSON.stringify(wilson(v, x.n))})`).join("; ")}`); } } }
fs.writeFileSync(path.join(HERE, "activation-binding.json"), JSON.stringify(out, null, 1) + "\n");
