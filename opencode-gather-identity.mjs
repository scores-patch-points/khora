// opencode-gather-identity.mjs — is the thing a page talks about the same being the sense names? The holographic identity test.
// Two mentions of a word are one being, for someone, when the universe folded on each is the same (bounded by a difference that makes a
// difference) and replacing it moves its surroundings more than chance does (native/kernel/identity-induction.js, through
// native/adapters/text/corpus-identity.js, at its declared parameters). A shared word only NOMINATES: "Jaguar" on a dealership page and
// "jaguars" in the cat's own article share the word and nothing else they are said with.
// The record follows the reading timeline's (native/adapters/text/reading-timeline.js): one node per referent per source, never merged
// across sources; one occurrence per sentence that mentions it; its features are the sentence's other named things (w:, keyed by their last
// word), its verbs (v:) and its nouns (n:, both by the part-of-speech prior), hop 1. The topic is a node in every page and in the sense's own article.
import fs from "node:fs";
import { makeSameBeing } from "./native/adapters/text/corpus-identity.js";

const POS = (() => { try { return JSON.parse(fs.readFileSync(new URL("./cli/priors/pos-prior-en.json", import.meta.url), "utf8")).forms ?? {}; } catch { return {}; } })();
const dominant = (w, tag) => { const f = POS[w]; if (!f) return false; const v = f[tag] ?? 0; return v > 0 && v >= Math.max(...Object.entries(f).filter(([k]) => k !== tag).map(([, n]) => n), 0); };
// nouns too (n:): the pages of an account name few people or places, so names and verbs alone leave most universes too thin to match
export const isNoun = (w) => dominant(w, "NOUN");
export const isVerb = (w) => { const f = POS[w]; if (!f) return false; const v = f.VERB ?? 0; return v > 0 && v >= Math.max(...Object.entries(f).filter(([k]) => k !== "VERB").map(([, n]) => n), 0); };

const sentencesOf = (text) => String(text ?? "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"“(])/u).filter((s) => s.length >= 20 && s.length <= 600);
const FN = new Set(["the", "a", "an", "this", "that", "these", "those", "in", "on", "at", "for", "of", "and", "but", "or", "it", "its", "they", "their", "he", "she", "we", "you", "i", "as", "by", "with", "from", "to", "is", "are", "was", "were", "when", "while", "if", "there", "here", "some", "many", "most", "all"]);
/** Capitalised runs, keyed by their last word, lower-cased; a sentence-opening function word is not a name. */
const namesOf = (s) => [...s.matchAll(/\p{Lu}[\p{L}’'-]*(?:\s+\p{Lu}[\p{L}’'-]*)*/gu)].map((m) => m[0].split(/\s+/).filter((t) => !FN.has(t.toLowerCase()))).filter((t) => t.length).map((t) => t[t.length - 1].toLowerCase().replace(/[’']s$/, ""));
const stemOf = (w) => w.toLowerCase().replace(/(?:ies)$/, "y").replace(/(?:es|s)$/, "");

/** The identity record of a set of texts ([{ id, text }]): every name with ≥ 3 mentions in its own text, and the topic, as nodes. */
export function recordOf(texts, topic) {
  const topicStem = stemOf(String(topic).trim().split(/\s+/).pop() ?? "");
  const record = new Map();
  const add = (node, feats) => (record.get(node) ?? record.set(node, []).get(node)).push([...feats].map((f) => ({ f, hop: 1 })));
  for (const { id, text } of texts) {
    const local = new Map();
    for (const s of sentencesOf(text)) {
      const words = s.toLowerCase().match(/[\p{L}’'-]+/gu) ?? [];
      const verbs = [...new Set(words.filter(isVerb))].map((v) => `v:${v}`).concat([...new Set(words.filter((w) => stemOf(w) !== topicStem && isNoun(w)))].map((n) => `n:${n}`));
      const names = [...new Set(namesOf(s))].filter((n) => stemOf(n) !== topicStem);
      if (words.some((w) => stemOf(w) === topicStem)) add(`topic@${id}`, [...names.map((n) => `w:${n}`), ...verbs]);
      for (const n of names) (local.get(n) ?? local.set(n, []).get(n)).push([...names.filter((o) => o !== n).map((o) => `w:${o}`), ...verbs]);
    }
    for (const [n, occs] of local) if (occs.length >= 3) for (const o of occs) add(`${n}@${id}`, o);
  }
  return record;
}

/** For each page: is its topic the same being as the topic in the reference text? { id -> { same, against, verdict, reason } } */
export function sameSense({ reference, pages, topic, sameBeing = makeSameBeing() }) {
  const record = recordOf([{ id: "ref", text: reference }, ...pages], topic);
  if (!record.has("topic@ref")) return { ok: false, reason: "the reference never mentions the topic", verdicts: new Map() };
  const judge = sameBeing.prepare(record);
  const verdicts = new Map();
  for (const p of pages) verdicts.set(p.id, record.has(`topic@${p.id}`) ? judge("topic@ref", `topic@${p.id}`) : { same: false, against: false, verdict: "gap", reason: "the page never mentions the topic" });
  return { ok: true, verdicts };
}
