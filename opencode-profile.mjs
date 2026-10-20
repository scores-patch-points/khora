// opencode-profile.mjs — THE PROFILE OF AN ANSWER. What the answer is (essay, code, chat), what in it is checkable,
// and, per checkable unit, what it rests on. MECHANICAL and PURE: no model, no network (research lives in
// opencode-research.mjs and feeds evidence back in through the same check).
//
// THE UNIT DEPENDS ON WHAT WAS WRITTEN:
//   prose — a CLAIM is a sentence that names a being, a number, a proper name or a quote. A sentence with none
//           of those is ARGUMENT (the writer's own voice) and is not checked: marking it [M] beside a real gap
//           drowned the gap. A question asserts nothing. A heading is a heading.
//   code  — a SYMBOL use: an import, a call, an option key handed to a call, a path. A symbol resolves to its
//           definition in the material (file:line), is defined by the answer itself, or is not found. An option
//           key is checked against the called function's own signature, so a key the signature does not take is
//           CONTRADICTED by the bytes of that signature, not merely unseen.
//
// STANDINGS (claims): supported · contradicted · unsupported · argument · question · heading.
// STANDINGS (symbols): found · own · contradicted · not_found.
// A claim is SUPPORTED when one evidence sentence is about the same subject (the claim's being, or the article
// the sentence came from), carries most of the claim's content words, and carries every number the claim states.
// It is CONTRADICTED when such a sentence carries the claim's content but a different year/number, or the
// opposite polarity. Everything is disclosed with the evidence's own bytes; the answer's words are never edited.

const STOP = new Set(("a an the and or but nor so yet for of to in on at by from with without into onto upon over under about after before " +
  "during since until while as than then that this these those there here it its is are was were be been being has have had do does did " +
  "not no never very also just only even still more most much many some any each every all both either neither such what which who whom " +
  "whose when where why how he she they them their his her him we us our you your i me my mine one ones own same other others can could " +
  "will would shall should may might must made make makes rarely often always sometimes once").split(" "));
// A personal pronoun near the front carries the last named being ("In 1934 she died…"). "it" does not: it refers to
// things and clauses far more often than to the being, and carrying on it turned argument into claims.
const PRONOUN = /\b(he|she|they|him|her|his|hers|them|their)\b/i;
const leadPronoun = (s) => PRONOUN.test(s.split(/\s+/).slice(0, 5).join(" "));
const NEGATION = /\b(not|never|no|none|neither|nor|without|n't)\b/i;

const words = (t) => String(t ?? "").toLowerCase().replace(/[’']s\b/g, "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const contentWords = (t) => [...new Set(words(t).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w) && !NUMBER_WORDS[w]))];
// Counts said in words are counts ("three Nobel Prizes", "won it twice"). "one" and "once" are left out: they are
// far more often "one of the…" and "once again" than a count.
const NUMBER_WORDS = { two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", twice: "2", thrice: "3" };
const numbersOf = (t) => {
  const digits = (String(t ?? "").match(/\b\d{1,4}(?:[.,]\d+)?\b/g) ?? []).map((n) => n.replace(",", "."));
  const said = words(t).flatMap((w) => (NUMBER_WORDS[w] ? [NUMBER_WORDS[w]] : []));
  return [...new Set([...digits, ...said])];
};
const years = (nums) => nums.filter((n) => /^\d{4}$/.test(n));
// Two word forms are one when one is a prefix of the other (discover/discovered/discovery, die/died) or they share a
// long common prefix. Crude, declared, and the same for every language that inflects by suffix.
const same = (a, b) => {
  if (a === b) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  if (s.length >= 3 && l.startsWith(s)) return true;
  let k = 0;
  while (k < s.length && s[k] === l[k]) k++;
  return k >= 5 && k >= Math.ceil(s.length * 0.75);
};
const carried = (want, have) => want.filter((w) => have.some((h) => same(w, h)));

// ── markdown → units ─────────────────────────────────────────────────────────────────────────────────────────────
const inlineStrip = (line) =>
  line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1");

/** The answer as ordered segments: headings, prose paragraphs (markdown stripped), code fences (with their language). */
export function segments(text) {
  const out = [];
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  let para = [], ticks = [];
  const flush = () => {
    if (para.length) out.push({ kind: "prose", raw: para.join("\n"), text: inlineStrip(para.join(" ")).replace(/\s+/g, " ").trim(), ticks: [...ticks] });
    para = []; ticks = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^\s*(```+|~~~+)\s*([\w+-]*)/.exec(line);
    if (fence) {
      flush();
      const body = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith(fence[1])) body.push(lines[j++]);
      out.push({ kind: "code", lang: fence[2] || null, text: body.join("\n") });
      i = j;
      continue;
    }
    const heading = /^\s*#{1,6}\s+(.*)$/.exec(line);
    if (heading) { flush(); out.push({ kind: "heading", text: inlineStrip(heading[1]).trim() }); continue; }
    if (!line.trim()) { flush(); continue; }
    for (const m of line.matchAll(/`([^`\n]+)`/g)) ticks.push(m[1]);
    para.push(line.replace(/^\s*(?:[-*+]|\d+[.)]|>)\s+/, ""));
  }
  flush();
  return out;
}

const splitPlain = (t) => (String(t).match(/[^.!?]+(?:[.!?]+["”’)\]]*|$)/g) ?? []).map((s) => s.trim()).filter((s) => s.length > 1);

/** Is this prose sentence a checkable claim? It names a being, a number, a proper name past the first word, or a quote. */
export function checkable(sentence, beings = []) {
  if (/\?\s*$/.test(sentence)) return "question";
  if (beings.length) return "claim";
  if (numbersOf(sentence).length) return "claim";
  if (/["“][^"”]{3,}["”]/.test(sentence)) return "claim";
  const toks = sentence.split(/\s+/).slice(1);
  if (toks.some((w) => /^[A-Z][\p{L}]{2,}/u.test(w.replace(/^[("'“]/, "")))) return "claim";
  return "argument";
}

// ── the check ────────────────────────────────────────────────────────────────────────────────────────────────────
// The JUDGE is The Fold's own (vendor/the-fold/fold-chat-falsify-answer.js, GROUNDING-BY-MEANING.md): per claim and per
// independent source, the best sentence is asked whether it STATES the claim (a run of shared words, every figure, every
// name, the same polarity), CONTRADICTS it (same subject, flipped polarity or a different figure), or is SILENT; then the
// SWAP attack replaces the claim's figure or name with a competitor the same source offers — a "states" that holds just as
// well for the swapped, false claim does not discriminate and is only "weak". This file does not write a second judge: it
// asks that one, and reads its verdict into the panel's standings with the witness sentence's own bytes and address.
import { falsifyAnswer } from "./vendor/the-fold/fold-chat-falsify-answer.js";

const STANDING = { corroborated: "supported", held: "supported", contested: "contradicted", weak: "unsupported", unsupported: "unsupported", "n/a": "argument" };

/** Where a sentence sits in a passage, as file:line (the passage's own bytes, never a model's copy). */
function addressOf(passage, sentence) {
  const text = String(passage?.text ?? "");
  const flat = (x) => x.replace(/\s+/g, " ");
  const probe = flat(sentence).slice(0, 60);
  const lines = text.split("\n");
  const at = lines.findIndex((l) => flat(l).includes(probe));
  if (at >= 0) return `${passage.name}:${at + 1}`;
  const whole = flat(text).indexOf(probe);
  return whole >= 0 ? `${passage.name}:${text.slice(0, Math.max(0, text.indexOf(probe.slice(0, 12)))).split("\n").length}` : passage.name;
}

/** The model's own earlier sentences are not evidence for themselves: struck from the passages before they are read. */
function withoutOwn(passages, own) {
  if (!own.length) return passages;
  const mine = own.flatMap((t) => splitPlain(String(t))).map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => x.length > 12);
  return passages.map((p) => ({ ...p, text: mine.reduce((t, sentence) => t.replace(new RegExp(esc(sentence).replace(/ /g, "\\s+"), "gi"), " "), String(p.text ?? "")) }));
}

const COUNT_WORD = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twice|thrice)\b/gi;
/** A count said in words in the claim that the witness sentence does not say ("three" where it says "two"). */
function numberWordsMissing(claim, witness) {
  const said = (String(claim).match(COUNT_WORD) ?? []).map((w) => w.toLowerCase());
  const has = (String(witness).match(COUNT_WORD) ?? []).map((w) => w.toLowerCase());
  return said.some((w) => !has.includes(w));
}
/** The claim's own content words (4+ letters), without the names it uses. */
function contentOf(claim) {
  const names = new Set((String(claim).match(/\b\p{Lu}[\p{L}'-]+/gu) ?? []).map((n) => n.toLowerCase()));
  return WORDS4(claim).filter((w) => !names.has(w));
}
const WORDS4 = (t) => [...new Set((String(t ?? "").toLowerCase().match(/[\p{L}]{4,}/gu) ?? []).filter((w) => !STOP.has(w)))];
const stemmed = (w) => w.replace(/(?:ing|ed|es|s|ly|ion|ions)$/u, "").slice(0, 5);
/** Content words of the claim (4+ letters) whose stem is not in the witness sentence. Names are not residue. */
function residueOf(claim, witness) {
  const have = new Set(WORDS4(witness).map(stemmed));
  const names = new Set((String(claim).match(/\b\p{Lu}[\p{L}'-]+/gu) ?? []).map((n) => n.toLowerCase()));
  return WORDS4(claim).filter((w) => !names.has(w) && !have.has(stemmed(w)) && ![...have].some((h) => h.startsWith(stemmed(w).slice(0, 4)))).slice(0, 4);
}

/** Judge sentences against passages: [{ standing, evidence?, why?, verdict, witnesses[], swap }] in the sentences' order. */
export function judgeAll(sentences, passages, { own = [] } = {}) {
  if (!sentences.length) return [];
  const read = withoutOwn(passages, own);
  const byRef = new Map(read.map((p) => [p.name, p]));
  const out = falsifyAnswer(sentences, read.map((p) => ({ ref: p.name, title: p.name, url: p.url ?? "", text: p.text })));
  return out.claims.map((c) => {
    const standing = STANDING[c.verdict] ?? "unsupported";
    const pick = standing === "contradicted" ? (c.witnesses.find((w) => w.verdict === "contradicts") ?? c.witnesses.find((w) => w.contraAlt)?.contraAlt) : standing === "supported" ? c.witnesses.find((w) => w.verdict === "states") : null;
    const source = pick ? (read.find((p) => (p.url ? new URL(p.url, "https://x").hostname.replace(/^www\./, "") === pick.src : p.name === pick.src) || p.name === pick.src) ?? byRef.get(pick.src)) : null;
    const evidence = pick?.sentence ? { source: source?.name ?? pick.src, ref: source ? addressOf(source, pick.sentence) : pick.src, ...(source?.url ? { url: source.url } : {}), text: pick.sentence.length > 320 ? pick.sentence.slice(0, 317) + "…" : pick.sentence } : undefined;
    // The claim's own content words the witness sentence does not carry ("train" for "wagon"): shown, never turned into a
    // verdict — a paraphrase has residue too — so the person sees what the support does NOT cover.
    const residue = standing === "supported" && pick?.sentence ? residueOf(sentences[c.i], pick.sentence) : [];
    // A support that leaves most of the claim's own words — or its count — uncovered is the name matching, not the claim:
    // an article about the subject names her in every sentence, so the shared name alone must not carry a claim.
    const own = contentOf(sentences[c.i]);
    const thin = standing === "supported" && pick?.sentence && (numberWordsMissing(sentences[c.i], pick.sentence) || (own.length >= 3 && residue.length / own.length >= 0.5));
    if (thin) return { standing: "unsupported", why: `the source names the subject but does not carry ${residue.length ? residue.join(", ") : "its count"}`, residue, verdict: "weak", chains: c.chains, ...(evidence ? { evidence } : {}) };
    return {
      standing,
      ...(evidence ? { evidence } : {}),
      ...(residue.length ? { residue } : {}),
      ...(standing === "contradicted" && pick?.why ? { why: pick.why } : {}),
      ...(c.verdict === "weak" ? { why: c.swap?.armed && !c.swap.discriminates ? "a source states it, but states the swapped (false) claim just as well" : "a source comes close, short of stating it" } : {}),
      verdict: c.verdict,
      chains: c.chains,
      swap: c.swap?.armed ? { discriminates: !!c.swap.discriminates } : undefined,
    };
  });
}
export const judge = (claim, passages, opts) => judgeAll([typeof claim === "string" ? claim : claim.text], passages, opts)[0];

/** The prose units of an answer, typed: heading · question · argument · claim (with its beings, carried across a pronoun). */
export function proseUnits(text, { resolve = () => [], split = splitPlain, known = [] } = {}) {
  const units = [];
  let last = [];
  // IN-TEXT COREFERENCE, the writer's own: a bare name ("Curie") is the fuller name the text or its material already
  // uses ("Marie Curie") when exactly one fuller name ends with it, or the most recently named one when several do.
  // Only that fuller name is ever looked up — a bare surname nominates a unit, a family and a crater as readily.
  const full = new Set(known);
  for (const seg of segments(text)) if (seg.kind === "prose") for (const raw of split(seg.text)) for (const b of resolve(String(typeof raw === "string" ? raw : raw?.text ?? ""))) full.add(b);
  const canon = (b) => {
    const longer = [...full].filter((f) => f !== b && f.split(/\s+/).length > b.split(/\s+/).length && f.endsWith(" " + b));
    if (longer.length === 1) return longer[0];
    if (longer.length > 1) return last.find((l) => longer.includes(l)) ?? b;
    return b;
  };
  for (const seg of segments(text)) {
    if (seg.kind === "heading") { units.push({ text: seg.text, standing: "heading" }); continue; }
    if (seg.kind !== "prose") continue;
    for (const raw of split(seg.text)) {
      const s = String(typeof raw === "string" ? raw : raw?.text ?? "").trim();
      if (s.length < 2) continue;
      // the SUBJECT first: the being named earliest in the sentence (found by its last name-word, since a canonical
      // "Marie Curie" may stand for a bare "Curie"); the fuller form is what a lookup can find
      const at = (b) => { const i = s.indexOf(b.split(/\s+/).at(-1)); return i < 0 ? Infinity : i; };
      let beings = [...new Set(resolve(s).map(canon))].sort((a, b) => at(a) - at(b) || b.length - a.length);
      let via = null;
      // A lead personal pronoun makes the last named being the SUBJECT; the beings this sentence names are its objects.
      if (leadPronoun(s) && last.length) { beings = [...last, ...beings.filter((b) => !last.includes(b))]; via = "pronoun"; }
      else if (beings.length) last = beings;
      const kind = checkable(s, beings);
      units.push({ text: s, standing: kind === "claim" ? "unchecked" : kind, ...(beings.length ? { beings } : {}), ...(via ? { carried: via, ...(/\b(he|she|him|his|her|hers)\b/i.test(s.split(/\s+/).slice(0, 5).join(" ")) ? { person: true } : {}) } : {}) });
    }
  }
  return units;
}

// ── code ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const KEYWORDS = new Set(("if for while switch catch return function typeof new await async yield import export from const let var class " +
  "interface type extends implements super this def lambda print elif with assert raise del pass in of as is not and or").split(" "));
const BUILTINS = new Set(("console Math JSON Promise setTimeout clearTimeout setInterval fetch require String Number Boolean Array Object " +
  "Date Error Map Set Symbol RegExp parseInt parseFloat isNaN encodeURIComponent decodeURIComponent structuredClone len range str int " +
  "float list dict set tuple open isinstance super").split(" "));

/** The top-level `{ … }` arguments of the call whose '(' is at `open`, as their key names. */
function callKeys(code, open) {
  const keys = [];
  let depth = 0, obj = -1, inStr = null;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (inStr) { if (c === "\\") i++; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "(" || c === "[" || c === "{") {
      depth++;
      if (c === "{" && depth === 2 && obj < 0) obj = i;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      if (c === "}" && depth === 2 && obj >= 0) {
        const body = code.slice(obj + 1, i);
        // only the object's own top level: nested calls, arrays and objects are blanked
        let d = 0, top = "";
        for (const ch of body) {
          if ("([{".includes(ch)) { d++; top += " "; } else if (")]}".includes(ch)) d--; else if (d === 0) top += ch;
        }
        for (const m of top.matchAll(/(?:^|[,\s])([A-Za-z_$][\w$]*)\s*:/g)) keys.push(m[1]);
        obj = -1;
      }
      depth--;
      if (depth === 0) break;
    }
  }
  return keys;
}

/** The symbol uses of the answer's code fences and of its prose's backticked spans. */
export function symbolUses(text) {
  const segs = segments(text);
  const code = segs.filter((s) => s.kind === "code");
  const own = new Set();
  for (const c of code) {
    for (const m of c.text.matchAll(/\b(?:const|let|var|function|class|interface|type|enum|def)\s+([A-Za-z_$][\w$]*)/g)) own.add(m[1]);
    for (const m of c.text.matchAll(/\(([^()]*)\)\s*(?:=>|:|\{)/g)) for (const p of m[1].split(",")) { const n = /^\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)/.exec(p); if (n) own.add(n[1]); }
    for (const m of c.text.matchAll(/\b([A-Za-z_$][\w$]*)\s*=>/g)) own.add(m[1]);
  }
  const uses = [];
  const seen = new Set();
  const add = (u) => { const k = `${u.kind}:${u.name}:${u.of ?? ""}`; if (!seen.has(k)) { seen.add(k); uses.push(u); } };
  const imported = new Set();
  const aliases = new Map(); // import { a as b }: a call of b is a call of a
  code.forEach((c, ci) => {
    const lineOf = (i) => c.text.slice(0, i).split("\n").length;
    for (const m of c.text.matchAll(/import\s+(?:type\s+)?(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s+["']([^"']+)["']/g)) {
      add({ kind: "path", name: m[3], block: ci, line: lineOf(m.index) });
      for (const n of [m[1], ...(m[2] ?? "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const [orig, alias] = x.split(/\s+as\s+/); if (alias) aliases.set(alias, orig); return orig; })].filter(Boolean)) { imported.add(n); add({ kind: "import", name: n, from: m[3], block: ci, line: lineOf(m.index) }); }
    }
    for (const m of c.text.matchAll(/from\s+([\w.]+)\s+import\s+([\w, ]+)/g)) for (const n of m[2].split(",").map((x) => x.trim()).filter(Boolean)) { imported.add(n); add({ kind: "import", name: n, from: m[1], block: ci, line: lineOf(m.index) }); }
    for (const m of c.text.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const written = m[2];
      if (KEYWORDS.has(written) || BUILTINS.has(written)) continue;
      const name = aliases.get(written) ?? written;
      const open = m.index + m[0].length - 1;
      // A function the ANSWER defines (or shadows) has its own signature, which is the answer's; the file's does not apply.
      if (own.has(written)) continue;
      add({ kind: "call", name, block: ci, line: lineOf(m.index + m[1].length) });
      for (const k of callKeys(c.text, open)) add({ kind: "key", name: k, of: name, block: ci, line: lineOf(c.text.indexOf(k + ":", open)) });
    }
  });
  for (const seg of segs.filter((s) => s.kind === "prose"))
    for (const t of seg.ticks) {
      const name = t.trim();
      if (/[/\\]|\.\w{1,5}$/.test(name) && !/\s/.test(name)) add({ kind: "path", name });
      else if (/^[A-Za-z_$][\w$.]*$/.test(name) && !own.has(name)) add({ kind: "mention", name, sentence: (splitPlain(seg.text).find((s) => s.includes(name)) ?? seg.text).slice(0, 200) });
    }
  return { uses, own: [...own], code };
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Where `name` is DEFINED in a set of passages: { passage, line, signature } — the definition's own bytes. */
export function definitionIn(name, passages) {
  const re = new RegExp(`(?:function\\s+${esc(name)}\\b|(?:const|let|var)\\s+${esc(name)}\\s*[:=]|class\\s+${esc(name)}\\b|def\\s+${esc(name)}\\b|interface\\s+${esc(name)}\\b|type\\s+${esc(name)}\\b|^\\s*(?:async\\s+)?${esc(name)}\\s*\\([^)]*\\)\\s*[:{])`, "m");
  for (const p of passages) {
    const text = String(p?.text ?? "");
    const m = re.exec(text);
    if (!m) continue;
    const line = text.slice(0, m.index).split("\n").length;
    const lines = text.split("\n");
    // the signature: from the definition line until its parameter list closes (bounded)
    let sig = "", depth = 0, opened = false;
    for (let i = line - 1; i < Math.min(lines.length, line + 12); i++) {
      sig += (sig ? "\n" : "") + lines[i];
      for (const ch of lines[i]) { if (ch === "(") { depth++; opened = true; } else if (ch === ")") depth--; }
      if (opened && depth <= 0) break;
    }
    return { passage: p.name, line, signature: sig.trim() };
  }
  return null;
}

const wordIn = (name, text) => new RegExp(`(^|[^\\w$])${esc(name)}([^\\w$]|$)`).test(text);

/** Resolve symbol uses against passages (and, through `look`, anything research adds). Pure. */
export function resolveSymbols({ uses, own }, passages, { exists = () => false } = {}) {
  const ownSet = new Set(own);
  const defs = new Map();
  const defOf = (n) => { if (!defs.has(n)) defs.set(n, definitionIn(n, passages)); return defs.get(n); };
  return uses.map((u) => {
    const base = { kind: u.kind, name: u.name, ...(u.of ? { of: u.of } : {}), ...(u.line ? { line: u.line } : {}), ...(u.sentence ? { sentence: u.sentence } : {}) };
    if (u.kind === "path") {
      const bare = u.name.replace(/^\.\.?\//, "").replace(/\.\w+$/, "");
      const hit = passages.find((p) => String(p.name).replace(/\.\w+$/, "").endsWith(bare));
      if (hit) return { ...base, standing: "found", ref: hit.name };
      if (exists(u.name)) return { ...base, standing: "found", ref: u.name };
      return { ...base, standing: "not_found" };
    }
    if (u.kind === "key") {
      const def = defOf(u.of);
      if (!def) return { ...base, standing: "unchecked", why: `${u.of} is not defined in what was read` };
      if (wordIn(u.name, def.signature)) return { ...base, standing: "found", ref: `${def.passage}:${def.line}`, evidence: { source: def.passage, ref: `${def.passage}:${def.line}`, text: def.signature } };
      const takes = (/\{([^{}]*)\}/.exec(def.signature)?.[1] ?? "").split(/[;,]/).map((x) => /^\s*([A-Za-z_$][\w$]*)\??\s*:/.exec(x)?.[1]).filter(Boolean);
      return { ...base, standing: "contradicted", ref: `${def.passage}:${def.line}`, why: takes.length ? `${u.of} takes { ${takes.join(", ")} }` : `${u.of}'s signature has no ${u.name}`, evidence: { source: def.passage, ref: `${def.passage}:${def.line}`, text: def.signature } };
    }
    if (ownSet.has(u.name)) return { ...base, standing: "own" };
    const def = defOf(u.name);
    if (def) return { ...base, standing: "found", ref: `${def.passage}:${def.line}`, evidence: { source: def.passage, ref: `${def.passage}:${def.line}`, text: def.signature } };
    const named = passages.find((p) => wordIn(u.name, String(p.text ?? "")));
    if (named) {
      const lines = String(named.text).split("\n");
      const i = lines.findIndex((l) => wordIn(u.name, l));
      return { ...base, standing: "found", ref: `${named.name}:${i + 1}`, evidence: { source: named.name, ref: `${named.name}:${i + 1}`, text: lines[i].trim() } };
    }
    return { ...base, standing: "not_found" };
  });
}

/** What kind of answer this is, and its size. */
export function kindOf(text, units) {
  const segs = segments(text);
  const codeLines = segs.filter((s) => s.kind === "code").reduce((n, s) => n + s.text.split("\n").length, 0);
  const sentences = units.filter((u) => u.standing !== "heading").length;
  const nwords = words(segs.filter((s) => s.kind !== "code").map((s) => s.text).join(" ")).length;
  const kind = codeLines && sentences > codeLines ? "mixed" : codeLines ? "code" : sentences >= 6 || segs.some((s) => s.kind === "heading") ? "essay" : "chat";
  return { kind, words: nwords, sentences, codeLines, langs: [...new Set(segs.filter((s) => s.kind === "code" && s.lang).map((s) => s.lang))] };
}

/** The rests-on roll-up: each source and how many checked units lean on it. */
export function restsOn(claims, symbols) {
  const by = new Map();
  for (const u of [...claims, ...symbols]) {
    const src = u.evidence?.source;
    if (!src || !["supported", "found", "contradicted"].includes(u.standing)) continue;
    by.set(src, (by.get(src) ?? 0) + 1);
  }
  return [...by.entries()].sort((a, b) => b[1] - a[1]).map(([source, n]) => ({ source, n }));
}
