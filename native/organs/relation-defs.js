// relation-defs.js — relation identity NOMINATED by the language's own definitions (Wiktionary, read on demand, cached), for the meaning check.
//
// Induction over a document's own co-text cannot do this alone: measured on AnaptysBio's filings, "enter" and "terminate" bind as one relation
// whether the features are their arguments or what follows them (eval/meaning PREREG run 5, 6). A definition says what a word IS:
//   synonym    B is a head verb of A's definition, or A of B's ("purchase: To buy, obtain by payment"; "buy: To obtain … in exchange for money")
//   converse   A's definition is the passive of B ("receive: To be given, sent, or paid something" → pay, give), or A and B fall on opposite
//              sides of the transfer (one gives or transfers, the other obtains or gets) with the same exchange in both definitions
//              ("sell: To transfer goods … in exchange for money" / "buy: To obtain (something) in exchange for money")
// The one declared class: which English head verbs are a transfer OUT (giver acts) and which IN (recipient acts) — giver: "declared: English
// verbs of transfer"; everything else is read from the definitions. A nomination is a pressure, not a verdict: an injected `veto(a, b, kind)`
// (the pocket's own induction, say) may refuse it.

const GENERIC = new Set(["be", "have", "make", "do", "cause", "put", "go", "come", "become", "use", "set", "form"]);
const OUT = new Set(["give", "transfer", "provide", "sell", "pay", "grant", "lend", "bestow", "confer", "deliver", "hand", "supply"]);
const IN = new Set(["get", "obtain", "receive", "acquire", "buy", "take", "borrow", "gain", "procure", "accept", "purchase"]);
const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/\.mw-parser-output[^}]*\}/g, " ").replace(/\s+/g, " ").replace(/\s+([,.;:])/g, "$1").trim();

/** the head verbs a definition text names ("To obtain (something) in exchange for money; to buy." → obtain, buy), and its passive heads */
export function headsOf(def) {
  const t = strip(def).toLowerCase(), heads = [], passive = [];
  for (const m of t.matchAll(/(?:^|[;,.]\s*|\bor\s+|\band\s+)to\s+(be\s+)?([a-z]+)(?:,\s*([a-z]+)(?:,?\s*or\s+([a-z]+))?)?/g)) {
    if (m[1]) { for (const p of [m[2], m[3], m[4]].filter(Boolean)) passive.push(p.replace(/(ed|en|n|d)$/, "").replace(/^giv$/, "give").replace(/^pai$/, "pay").replace(/^sen$/, "send")); }
    else heads.push(...[m[2], m[3], m[4]].filter(Boolean));
  }
  return { heads: heads.filter((h) => !GENERIC.has(h)), passive, exchange: /in exchange for|by payment|with money|for money/.test(t) };
}
/** a word's verb definitions → the first `senses` read by headsOf. Three shapes are read: a Wiktionary REST payload ({ en: [{ partOfSpeech,
 *  definitions }] }), wiktextract entries ([{ lang_code, pos, senses: [{ glosses }] }]), or a VerbIndex@1 row (an array of gloss strings) */
export function verbSensesOf(payload, senses = 3) {
  let defs;
  if (Array.isArray(payload) && payload.every((x) => typeof x === "string")) defs = payload;
  else if (Array.isArray(payload)) defs = wiktextractGlosses(payload);
  else defs = (payload?.en ?? []).filter((e) => e.partOfSpeech === "Verb").flatMap((e) => e.definitions ?? []).map((d) => d.definition);
  return defs.filter((d) => strip(d)).slice(0, senses).map(headsOf);
}
/** an English verb's glosses from wiktextract entries, in order; a sense that only names another form ("simple past of pay") says nothing */
export function wiktextractGlosses(entries) {
  return entries.filter((e) => (e.lang_code ?? "en") === "en" && e.pos === "verb").flatMap((e) => e.senses ?? [])
    .filter((x) => !x.form_of && !x.alt_of && !(x.tags ?? []).includes("form-of")).map((x) => (x.glosses ?? []).at(-1)).filter(Boolean);
}
/** wiktextract JSONL lines (any iterable of strings) → VerbIndex@1 { schema, words: { word: [first `keep` glosses] } } */
export async function verbIndexFromWiktextract(lines, { keep = 3 } = {}) {
  const words = {};
  for await (const line of lines) {
    if (!line.includes('"pos": "verb"') && !line.includes('"pos":"verb"')) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    const w = String(e.word ?? "").toLowerCase(); if (!w || / /.test(w)) continue;
    const g = wiktextractGlosses([e]); if (!g.length) continue;
    words[w] = [...(words[w] ?? []), ...g].slice(0, keep);
  }
  return { schema: "VerbIndex@1", source: "wiktextract (English Wiktionary)", words };
}
/** a VerbIndex@1 file (.json or .json.gz) → a lookup makeRelationDefs takes */
export async function loadVerbIndexFile(file) {
  const { readFileSync } = await import("node:fs"), { gunzipSync } = await import("node:zlib");
  const buf = readFileSync(file), j = JSON.parse((file.endsWith(".gz") ? gunzipSync(buf) : buf).toString("utf8"));
  return (w) => j.words[w] ?? null;
}

/** makeRelationDefs(lookup, { veto }) → { relate(a, b) → "same" | "converse" | null, classOf(v) → "out" | "in" | "both" | null } */
export function makeRelationDefs(lookup, { veto = null } = {}) {
  const memo = new Map();
  // a prefixed verb the dictionary has no entry for reads as its stem ("out-license" → license): what the prefix adds, the frame's case marking says
  const sensesOf = (v) => { if (!memo.has(v)) { let p = null; try { p = lookup(v); } catch { p = null; } memo.set(v, p ? verbSensesOf(p) : []); if (!memo.get(v).length && /^\p{L}+-\p{L}+$/u.test(v)) memo.set(v, sensesOf(v.slice(v.indexOf("-") + 1))); } return memo.get(v); };
  const heads = (v) => new Set(sensesOf(v).flatMap((s) => s.heads));
  const passive = (v) => new Set(sensesOf(v).flatMap((s) => s.passive));
  const exchange = (v) => sensesOf(v).some((s) => s.exchange);
  const classOf = (v) => (OUT.has(v) ? "out" : IN.has(v) ? "in" : [...heads(v)].some((h) => OUT.has(h)) && ![...heads(v)].some((h) => IN.has(h)) ? "out" : [...heads(v)].some((h) => IN.has(h)) && ![...heads(v)].some((h) => OUT.has(h)) ? "in" : passive(v).size && [...passive(v)].some((h) => OUT.has(h)) ? "in" : null);
  const twoSided = (v) => !OUT.has(v) && !IN.has(v) && [...heads(v)].some((h) => OUT.has(h)) && [...heads(v)].some((h) => IN.has(h));
  function relate(a, b) {
    if (!a || !b || a === b) return a === b ? "same" : null;
    const ha = heads(a), hb = heads(b);
    let kind = null;
    // A is said as the passive of B, or of a verb B's definition is headed by ("receive: To be given, sent, or paid" / "pay: To give money")
    if (passive(a).has(b) || passive(b).has(a) || [...passive(a)].some((p) => hb.has(p)) || [...passive(b)].some((p) => ha.has(p))) kind = "converse";
    else if (ha.has(b) || hb.has(a) || [...ha].some((h) => hb.has(h))) kind = classOf(a) && classOf(b) && classOf(a) !== classOf(b) ? "converse" : "same";
    else if (classOf(a) && classOf(b) && classOf(a) !== classOf(b) && exchange(a) === exchange(b)) kind = "converse";
    // two steps through one shared word whose definition names both, on the same side of a transfer ("get: To obtain … To receive")
    else { for (const x of new Set([...ha, ...hb])) { if (GENERIC.has(x)) continue; const hx = heads(x); if ((ha.has(x) || hx.has(a)) && (hb.has(x) || hx.has(b)) && classOf(a) === classOf(b)) { kind = "same"; break; } } }
    // a converse joins the two sides of a transfer: two verbs on the same side are never converses ("buy" and "receive" are both taking)
    if (kind === "converse" && classOf(a) && classOf(b) && classOf(a) === classOf(b)) kind = null;
    // a verb whose senses fall on BOTH sides of a transfer ("license: To give formal authorization to use … To acquire authorization to use")
    // has no direction its definitions can give: it joins the other verb's relation as the same one, never as its converse, and the claim's
    // frame takes the direction from its case marking ("licensed from Vanda" takes, "licensed to GSK" gives)
    if (kind && (twoSided(a) || twoSided(b))) kind = "same";
    if (kind && veto && veto(a, b, kind)) return null;
    return kind;
  }
  // the side a claim's frame is read by: a two-sided verb is "both", and its frame takes the side its case marking says (to: giving, from: taking)
  return { relate, classOf: (v) => (twoSided(v) ? "both" : classOf(v)) };
}
