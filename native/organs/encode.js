// native/organs/encode.js — the ENCODE leg of the Isthmus (native/docs/THE-ISTHMUS.md): EOT out through the TARGET language's codec.
// Handle: Chomsky, reversed (kernel/eot-realize.js): a deep structure is universal; a language projects it back into speech.
//
// encodeCopula({ frame, value, language }) → { text, gaps, by } — a copular fact ("<frame> is <value>") said in `language`:
//   DECODE the frame with the language's own codec (grammar-en / grammar-ud: UD rows, the frame's words exactly as the asker wrote them —
//   copied bytes are never translated), ATTACH it as the subject (nsubj) of a clause whose root is the grounded value, take the COPULA from
//   the language's marker table (UDGrammar@1 `markers`: cop|<value's class>, else cop) and its finite third-person present form from the
//   language's form table (`forms`), and PLACE every word by the language's measured order parameters (`order`, eot-rich.js::linearize).
//   Nothing English is applied to another language: a missing codec, marker or form is a typed gap and the caller keeps its own sentence.
// The UDGrammar@1 prior is data, read from janus's priors (the prior door's home) or this machine's codec cache; khora imports janus nowhere.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { linearize } from "../kernel/eot-rich.js";
import { codecCache } from "../adapters/text/grammar-ud.js";
import { stemOf, iso1Of } from "../the-fold/language-grammar.js";

const PRIORS = new URL("../priors", import.meta.url).pathname;
const grammars = new Map();
/** The language's UDGrammar@1 (the way back from EOT), from the priors or the codec cache, or null. */
export function udGrammar(language, { priors = PRIORS, cache = codecCache() } = {}) {
  const code = /^[a-z]{3}$/.test(String(language ?? "")) ? language : stemOf(language);
  if (!code) return null;
  if (grammars.has(code)) return grammars.get(code);
  let g = null;
  for (const d of [priors, cache]) { const p = join(d, `ud-grammar-${code}.json.gz`); if (existsSync(p)) { try { g = JSON.parse(gunzipSync(readFileSync(p))); } catch { g = null; } break; } }
  grammars.set(code, g);
  return g;
}

const parseFeats = (s) => Object.fromEntries(String(s ?? "").split("|").filter((x) => x && x !== "_").map((kv) => kv.split("=")));
// the copula's finite form: third person, singular, present, indicative, finite — UD's universal feature names, never a language's word
const FINITE_3SG_PRESENT = { Mood: "Ind", Number: "Sing", Person: "3", Tense: "Pres", VerbForm: "Fin" };

/** The form table's word for (upos, lemma) carrying every wanted feature, the fewest extra features first; null when none is attested. */
export function formOf(g, upos, lemma, want = {}) {
  const pre = `${upos}|${lemma}|`;
  let best = null, bestExtra = Infinity;
  for (const [k, form] of Object.entries(g?.forms ?? {})) {
    if (!k.startsWith(pre)) continue;
    const f = parseFeats(k.slice(pre.length));
    if (!Object.entries(want).every(([n, v]) => f[n] === v)) continue;
    const extra = Object.keys(f).length - Object.keys(want).length;
    if (extra < bestExtra) { best = form; bestExtra = extra; }
  }
  return best;
}

/** The frame's UD rows by the language's own codec (grammar-en for English, grammar-ud for any language whose codec is held), or null. */
async function frameRows(frame, language) {
  const code = /^[a-z]{3}$/.test(String(language ?? "")) ? language : stemOf(language);
  if (code === "eng") { const GE = await import("../adapters/text/grammar-en.js"); return GE.rowsOf(frame); }
  const { loadGrammar } = await import("../adapters/text/grammar-ud.js");
  const G = await loadGrammar(iso1Of(code) ?? code, {});
  return G ? G.rowsOf(frame) : null;
}

export async function encodeCopula({ frame, value, language }, opts = {}) {
  const gaps = [];
  const g = udGrammar(language, opts);
  if (!g) return { text: null, gaps: [{ gap: "no_codec", detail: `no UDGrammar@1 (the way back) for ${language}` }] };
  const rows = await frameRows(String(frame ?? "").trim(), g.code).catch(() => null);
  if (!rows?.length) return { text: null, gaps: [{ gap: "no_decode", detail: `the frame could not be read by ${g.code}'s codec` }] };
  const top = rows.filter((r) => r.head === 0);
  if (top.length !== 1) return { text: null, gaps: [{ gap: "frame_not_a_phrase", detail: `${top.length} roots in the frame` }] };
  const valueUpos = /^\p{N}/u.test(String(value)) ? "NUM" : "PROPN";
  const cop = g.markers?.[`cop|${valueUpos}`] ?? g.markers?.cop ?? null;
  // EOT rows: the frame is ONE unit (its root's class, the value's subject) whose words are the asker's own bytes, in the asker's order —
  // the codec decides where the unit, the copula and the value stand, never the inside of a phrase it did not write
  const head = top[0];
  const ann = [{ key: "f", lemma: head.lemma, upos: head.upos, feats: head.feats, head: "v", deprel: "nsubj", form: String(frame).trim() }];
  ann.push({ key: "v", lemma: String(value), upos: valueUpos, feats: "_", head: null, deprel: "root", form: String(value) });
  if (cop) {
    // the copula's present form, by what the table attests: the finite third-person present where the language marks those features;
    // the featureless form where its treebank marks no features for that word (UD Japanese); and where the word carries features but no
    // present form at all, the language spends NO copula in the present (Russian, Arabic): the clause is nominal, disclosed
    const entries = Object.keys(g.forms ?? {}).filter((k) => k.startsWith(`${cop.upos}|${cop.lemma}|`));
    const featureless = entries.length > 0 && entries.every((k) => k.endsWith("|"));
    // a featureless table names one form for the word and cannot say which is finite (UD Japanese だ → its most frequent form, "で"): a gap
    if (featureless) return { text: null, gaps: [{ gap: "form_unmarked", detail: `${g.code}'s table carries no features for ${cop.lemma}: which form is finite is not attested` }] };
    const copForm = formOf(g, cop.upos, cop.lemma, FINITE_3SG_PRESENT);
    if (copForm) ann.push({ key: "c", lemma: cop.lemma, upos: cop.upos, feats: "_", head: "v", deprel: "cop", form: copForm });
    else if (entries.length) gaps.push({ gap: "nominal_present", info: true, detail: `${g.code}'s table attests ${cop.lemma} in no finite third-person present form: the present clause is nominal` });
    else return { text: null, gaps: [{ gap: "form_unattested", detail: `${cop.upos} ${cop.lemma} is not in ${g.code}'s form table` }] };
  } else gaps.push({ gap: "no_copula", info: true, detail: `${g.code}'s marker table has no copula: the clause is nominal, as the treebank writes it` });
  const order = linearize(ann, g.order ?? {});
  const byKey = new Map(ann.map((r) => [r.key, r]));
  const words = order.map((k) => byKey.get(k)?.form).filter(Boolean);
  let text = g.spaced === false ? words.join("") : words.join(" ");
  if (/^\p{Ll}/u.test(text)) text = text[0].toLocaleUpperCase(g.code) + text.slice(1);
  return { text, gaps, by: `UDGrammar@1 ${g.code} (${g.treebank}; order tau ${g.scores?.orderKendallTau ?? "?"}, forms ${g.scores?.formTableHit ?? "?"}%)` };
}
