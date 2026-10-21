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
/** a Wiktionary REST definition payload → the first `senses` verb senses read by headsOf */
export function verbSensesOf(payload, senses = 3) {
  const en = payload?.en ?? [];
  return en.filter((e) => e.partOfSpeech === "Verb").flatMap((e) => e.definitions ?? []).map((d) => d.definition).filter((d) => strip(d)).slice(0, senses).map(headsOf);
}

/** makeRelationDefs(lookup, { veto }) → { relate(a, b) → "same" | "converse" | null, classOf(v) → "out" | "in" | null } */
export function makeRelationDefs(lookup, { veto = null } = {}) {
  const memo = new Map();
  const sensesOf = (v) => { if (!memo.has(v)) { let p = null; try { p = lookup(v); } catch { p = null; } memo.set(v, p ? verbSensesOf(p) : []); } return memo.get(v); };
  const heads = (v) => new Set(sensesOf(v).flatMap((s) => s.heads));
  const passive = (v) => new Set(sensesOf(v).flatMap((s) => s.passive));
  const exchange = (v) => sensesOf(v).some((s) => s.exchange);
  const classOf = (v) => (OUT.has(v) ? "out" : IN.has(v) ? "in" : [...heads(v)].some((h) => OUT.has(h)) && ![...heads(v)].some((h) => IN.has(h)) ? "out" : [...heads(v)].some((h) => IN.has(h)) && ![...heads(v)].some((h) => OUT.has(h)) ? "in" : passive(v).size && [...passive(v)].some((h) => OUT.has(h)) ? "in" : null);
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
    if (kind && veto && veto(a, b, kind)) return null;
    return kind;
  }
  return { relate, classOf };
}
