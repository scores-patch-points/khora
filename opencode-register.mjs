// opencode-register.mjs — the verbatim register: what the PERSON said, kept by the machine, not by a model.
//
// A long conversation is compacted by a model-written summary, and a summary turns "the mascot is called Orbit" into
// "mascot name unknown" (measured: foldcode-poc/FAILURES.md F1). Statements of fact are not prose to be condensed: they are
// bindings with a subject, a value and a turn. So the door reads each user turn, keeps its declarative sentences VERBATIM,
// marks an earlier statement superseded when a later one speaks about the same subject, and returns a small block the plugin
// injects each turn. No model, no paraphrase: the words in the block are the words that were typed.
//
// What it does NOT do: answer, decide, or judge truth. It stores what was said and which statement is newest.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const VERB = "is|are|was|were|has|have|had|ends?|starts?|begins?|moved|changed|switched|renamed|runs?|costs?|pays?|owns?|lives?|means|equals|called|named|will be|stays?|opens?|closes?";
const VERB_RE = new RegExp(`\\b(?:${VERB})\\b`, "i");
const NOT_A_STATEMENT = /^(?:you (?:told|said|mentioned|wrote|asked|promised)|earlier you|what|which|who|whom|whose|when|where|why|how|is|are|do|does|did|can|could|would|will|should|please|explain|write|list|describe|tell|give|show|make|compare|summari[sz]e|in roughly|in about|read|run|check|find|fix|add|remove|create|update the|can you)\b/i;
const CUE = /^(?:update|note|fyi|heads up|reminder|correction|also|ps)\s*[:,\-–]\s*/i;
const DET = /^(?:our|my|your|their|its|the|a|an|this|that|these|those|we|new)\s+/i;
const PRONOUN_VALUE = /^(?:it|they|this|that)\s+(?:is|are|will be|has|have)\b/i;

export const sentencesOf = (text) =>
  String(text ?? "").split(/\n+/).flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/)).map((s) => s.trim()).filter(Boolean);

// A coordinated second clause with its own subject and verb is its own statement: "A is X and the B has Y".
export const clausesOf = (sentence) => {
  const m = sentence.match(/^(.*?\b(?:${VERB})\b.*?),?\s+and\s+((?:the|our|its|their|a)\s+[^,.]{2,60}?\s+(?:${VERB})\b.*)$/i);
  const re = new RegExp(`^(.*?\\b(?:${VERB})\\b.*?),?\\s+and\\s+((?:the|our|its|their|a)\\s+[^,.]{2,60}?\\s+(?:${VERB})\\b.*)$`, "i");
  const r = sentence.match(re);
  void m;
  return r ? [r[1].trim().replace(/[,;]$/, ""), r[2].trim()] : [sentence];
};

export const isStatement = (s) => {
  if (s.length < 8 || s.length > 320) return false;
  if (/\?\s*$/.test(s)) return false;
  const body = s.replace(CUE, "");
  if (NOT_A_STATEMENT.test(body)) return false;
  if (!VERB_RE.test(body)) return false;
  // a change event ("the deploy window moved") carries no value of its own; the sentence that follows does ("It is now ...")
  if (/\b(?:moved|changed|switched|renamed|replaced|updated|now)\b/i.test(body)) return true;
  return /\d|[A-Z]/.test(body.slice(1)) || /\b(?:called|named)\b/i.test(body); // a value: a number, a name, an id
};

// The subject a statement is about: the words before its first verb, without determiners or a lead-in cue.
export const subjectOf = (s) => {
  const body = s.replace(CUE, "").replace(/[.!]+$/, "");
  const m = body.match(new RegExp(`^(.*?)\\s+(?:${VERB})\\b`, "i"));
  if (!m) return null;
  let words = m[1].trim().replace(DET, "").replace(DET, "").toLowerCase().replace(/[^\p{L}\p{N}\- ]+/gu, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const subject = words.slice(-6).join(" ");
  return /^(?:it|they|this|that|he|she)$/.test(subject) ? null : subject; // a bare pronoun is not a subject
};
const same = (a, b) => {
  if (!a || !b) return false;
  if (a === b) return true;
  const A = new Set(a.split(" ")), B = new Set(b.split(" "));
  const small = A.size <= B.size ? A : B, big = A.size <= B.size ? B : A;
  return small.size >= 2 && [...small].every((w) => big.has(w));
};

const DIR = () => process.env.FOLD_REGISTER_DIR ?? path.join(os.homedir(), ".fold", "register");
const sessions = new Map();
const file = (sid) => path.join(DIR(), `${String(sid).replace(/[^\w.-]/g, "_")}.json`);
const load = (sid) => {
  if (sessions.has(sid)) return sessions.get(sid);
  let st = { turns: 0, lastAsk: "", entries: [] };
  try { st = JSON.parse(fs.readFileSync(file(sid), "utf8")); } catch { /* new session */ }
  sessions.set(sid, st);
  return st;
};
const save = (sid, st) => { try { fs.mkdirSync(DIR(), { recursive: true }); fs.writeFileSync(file(sid), JSON.stringify(st)); } catch { /* the register never blocks a turn */ } };

/** Record one user turn. Returns the statements it contributed. */
export function record({ sessionID, ask }) {
  const sid = String(sessionID ?? "");
  if (!sid || !String(ask ?? "").trim()) return [];
  const st = load(sid);
  if (st.lastAsk === ask) return [];
  st.lastAsk = ask;
  st.turns++;
  const added = [];
  let prev = null; // the entry the previous sentence made, so "It is now Y" binds to it
  for (const sentence of sentencesOf(ask)) {
    if (PRONOUN_VALUE.test(sentence) && prev) { prev.text += " " + sentence; continue; }
    for (const clause of clausesOf(sentence)) {
      prev = null;
      if (!isStatement(clause)) continue;
      const e = { turn: st.turns, text: clause, subject: subjectOf(clause), by: null };
      for (const old of st.entries) if (!old.by && same(old.subject, e.subject)) old.by = e.turn;
      st.entries.push(e); added.push(e); prev = e;
    }
  }
  save(sid, st);
  return added;
}

/** The block the plugin injects: every statement, verbatim, with the replaced ones marked. */
export function registerNote({ sessionID, ask, maxChars = 5000, maxEntries = 60 }) {
  const sid = String(sessionID ?? "");
  if (!sid) return { gap: "no-session" };
  record({ sessionID: sid, ask });
  const st = load(sid);
  if (!st.entries.length) return { gap: "empty" };
  let list = st.entries.slice();
  // over budget: shed the replaced statements first (oldest first), then the oldest of the rest
  const size = (xs) => xs.reduce((n, e) => n + e.text.length + 24, 200);
  while ((list.length > maxEntries || size(list) > maxChars) && list.length > 1) {
    const i = list.findIndex((e) => e.by);
    list.splice(i >= 0 ? i : 0, 1);
  }
  const lines = list.map((e) => `[turn ${e.turn}]${e.by ? ` (replaced at turn ${e.by})` : ""} ${e.text}`);
  const note = [
    `<fold-register source="the person's own statements, kept word for word by the machine (not written by a model)">`,
    `Where a statement is marked replaced, the later statement about the same subject is the current one. Quote from here; do not paraphrase.`,
    ...lines,
    `</fold-register>`,
  ].join("\n");
  return { note, entries: list.length, chars: note.length };
}

export const _resetForTest = () => sessions.clear();
