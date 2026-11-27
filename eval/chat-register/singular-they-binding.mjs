// EXPLORATORY (the rule is mine and was fixed before the run; DEV sets only: CorefUD 1.3 English GUM dev and LitBank dev; the public test sets are not local).
// THE OWNER'S WORD (2026-11-24): bind a singular "they" in the user's sentences "only if it seems right". So: does it? The rule to test, nothing else:
//   a "they / them / their / themselves" with EXACTLY ONE named person in the window (the sentence so far and the one before it, N = 2) points at that person;
//   with two or more it is a group (the chat says so or asks, it does not pick one); with none it stays open.
// "Named person" = a gold entity of type person that has a mention with a proper-noun token in the window (the chat's cast admits a being by a name signal). Scored against the corpus's own coreference:
// right = the pronoun's gold entity IS that person. Wrong = anything else (a group, an unnamed referent, a non-person, no entity at all: a singleton). The same rule is scored for he / she (one named person
// in the window, gold entity is that person) as the reference for what "seems right" means in this window. Intervals are Wilson 95%. Sensitivity to the window (N = 1, 3) is reported, not chosen.
//   node eval/chat-register/singular-they-binding.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const DATA = process.env.COREFUD_DIR ?? "/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data";
const SETS = { "GUM dev": `${DATA}/CorefUD_English-GUM/en_gum-corefud-dev.conllu`, "LitBank dev": `${DATA}/CorefUD_English-LitBank/en_litbank-corefud-dev.conllu` };
const THEY = new Set(["they", "them", "their", "theirs", "themselves", "themself"]), HE = new Set(["he", "him", "his", "himself"]), SHE = new Set(["she", "her", "hers", "herself"]);
const wilson = (k, n) => { if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+((c - m) / d).toFixed(3), +((c + m) / d).toFixed(3)]; };
// parse: documents -> sentences -> tokens, with the entity stack read from the Entity attribute: "(eID-type-…" opens a mention, ")" closes the innermost one (the GUM / LitBank CorefUD form)
function parse(file) {
  const docs = []; let doc = null, sent = null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# newdoc")) { doc = { sents: [] }; docs.push(doc); continue; }
    if (line === "") { sent = null; continue; }
    if (line.startsWith("#")) continue;
    const c = line.split("\t"); if (!/^\d+$/.test(c[0])) continue;   // regex-ok: a CoNLL-U token id, not language
    if (!sent) { sent = { toks: [], mentions: [] }; (doc ?? (doc = { sents: [] }, docs.push(doc))).sents.push(sent); }
    const t = { i: sent.toks.length, form: c[1], upos: c[3], feats: c[5] }; sent.toks.push(t);
    const ent = (c[9].split("|").find((x) => x.startsWith("Entity=")) ?? "").slice(7); sent.stack ??= [];
    for (let k = 0; k < ent.length;) {
      if (ent[k] === "(") { let j = k + 1; while (j < ent.length && ent[j] !== "(" && ent[j] !== ")") j++; const [id, type] = ent.slice(k + 1, j).split("-"); sent.stack.push({ id, type, start: t.i }); k = j; }
      else if (ent[k] === ")") { const m = sent.stack.pop(); if (m) sent.mentions.push({ ...m, end: t.i }); k++; }
      else k++;
    }
  }
  return docs;
}
function score(docs, N) {
  const tally = { they: { one: [0, 0], two: [0, 0], none: 0, all: 0 }, he: { one: [0, 0], two: [0, 0], none: 0, all: 0 }, she: { one: [0, 0], two: [0, 0], none: 0, all: 0 } };
  const wrongKinds = { group: 0, nonperson: 0, singleton: 0, otherPerson: 0 }, rows = [];
  for (const d of docs) for (let si = 0; si < d.sents.length; si++) {
    const s = d.sents[si];
    for (const m of s.mentions) {
      if (m.start !== m.end) continue; const t = s.toks[m.start]; if (t.upos !== "PRON") continue; const w = t.form.toLowerCase(), kind = THEY.has(w) ? "they" : HE.has(w) ? "he" : SHE.has(w) ? "she" : null; if (!kind) continue;
      if (kind === "they" && !/Person=3/.test(t.feats)) continue;   // regex-ok: a CoNLL-U feature string
      // the named persons in the window: entities of type person with a mention containing a PROPN, in the sentences si-N+1 .. si (the current one only up to the pronoun)
      const cand = new Map();
      for (let sj = Math.max(0, si - N + 1); sj <= si; sj++) for (const mm of d.sents[sj].mentions) { if (mm.type !== "person") continue; if (sj === si && mm.end >= m.start) continue; const toks = d.sents[sj].toks.slice(mm.start, mm.end + 1); if (!toks.some((x) => x.upos === "PROPN")) continue; cand.set(mm.id, (cand.get(mm.id) ?? 0) + 1); }
      const T = tally[kind]; T.all++;
      if (cand.size === 0) { T.none++; continue; }
      if (cand.size === 1) { const ok = cand.has(m.id); T.one[1]++; if (ok) T.one[0]++; else if (kind === "they") { const pe = [...d.sents.flatMap((x) => x.mentions)].filter((x) => x.id === m.id); const types = new Set(pe.map((x) => x.type)); wrongKinds[types.has("person") ? "group" : "nonperson"]++; } rows.push({ kind, ok, form: t.form }); }
      else { T.two[1]++; if (cand.has(m.id)) T.two[0]++; }   // two or more named persons: how often the pronoun is still one of them (the group reading would then be wrong)
    }
  }
  // a they that has no entity in the gold at all is a singleton: it never matches a candidate, and was counted wrong above under "group"/"nonperson"; split it out
  return { tally, wrongKinds };
}
const commit = (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })();
const out = { stamp: { when: new Date().toISOString(), split: "EXPLORATORY (DEV: CorefUD 1.3 English GUM dev and LitBank dev; the rule was fixed before the run; N = 2 chosen before the run, N = 1 and 3 reported)", commit, data: Object.fromEntries(Object.entries(SETS).map(([k, f]) => [k, fs.existsSync(f) ? "present" : "MISSING"])) }, results: {} };
for (const [name, file] of Object.entries(SETS)) {
  if (!fs.existsSync(file)) { console.log(`${name}: ${file} not found (a typed gap: set COREFUD_DIR)`); continue; }
  const docs = parse(file); out.results[name] = {};
  for (const N of [1, 2, 3]) { const { tally, wrongKinds } = score(docs, N); out.results[name][`N${N}`] = { tally, wrongKinds };
    const f = (k) => { const T = tally[k]; return `${k}: ${T.all} in all, one named person in the window ${T.one[0]} of ${T.one[1]} right ${T.one[1] ? Math.round(100 * T.one[0] / T.one[1]) + "% " + JSON.stringify(wilson(T.one[0], T.one[1])) : ""}; two or more named persons ${T.two[1]} (the pronoun is one of them in ${T.two[0]}); none ${T.none}`; };
    console.log(`${name}, window N=${N}:\n   ${f("they")}\n   ${f("he")}\n   ${f("she")}${N === 2 ? `\n   when "they" with one candidate was wrong: ${JSON.stringify(wrongKinds)}` : ""}`); }
}
fs.writeFileSync(path.join(HERE, "singular-they-binding.json"), JSON.stringify(out, null, 1) + "\n");
