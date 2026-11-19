// nest-grain.js — what counts for the question, over a nest of holons (identity/novels/PREREG-ROUND28.md). Round 27's place-grain.js had three fixed levels; this takes any depth.
import { tokenize, analyse } from "./english-parser.js"; import { pathOf, sharedGround } from "./holon-nest.js";
export const NOUNS = Object.freeze(["city", "town", "village", "municipality", "county", "district", "borough", "parish", "state", "province", "region", "prefecture", "department", "canton", "country"]); const ALIAS = { nation: "country" };
const norm = (l) => { const x = String(l ?? "").toLowerCase(); return ALIAS[x] ?? (NOUNS.includes(x) ? x : null); };
// The noun a question asks for, read by the parser: the noun a wh-determiner governs; else the first list noun within three tokens after "which"/"what"; else the one list noun the question names; else "open" for a bare "where"; else null.
export function grainNounOfQuestion(model, text) {
  const toks = tokenize(String(text)); if (!toks.length) return { grain: null, why: "empty" }; const rows = analyse(model, toks.map((t) => t.form)); const nounOf = (r) => (/^(NOUN|PROPN)$/.test(r.upos) ? norm(r.lemma ?? r.form) : null);
  for (const r of rows) { const n = nounOf(r); if (n && rows.some((d) => d.head === r.id && /^(which|what)$/i.test(d.form))) return { grain: n, why: "wh-determiner governs the noun" }; }
  rows.forEach((r, i) => { r._i = i; }); for (const r of rows) if (/^(which|what)$/i.test(r.form)) for (let j = r._i + 1; j <= r._i + 3 && j < rows.length; j++) { const n = norm(rows[j].lemma ?? rows[j].form); if (n) return { grain: n, why: "list noun within three tokens after the wh-word" }; }
  const named = [...new Set(rows.map(nounOf).filter(Boolean))]; if (named.length === 1) return { grain: named[0], why: "the one list noun the question names" }; if (named.length > 1) return { grain: null, why: "more than one list noun" };
  if (rows.some((r) => /^where$/i.test(r.form))) return { grain: "open", why: "bare where" }; return { grain: null, why: "no grain" };
}
// the holon on the subject's path that the noun names: a whole-word match against the holon's class names; "country" nearest the root, any other noun nearest the subject
export function askedHolon(nodes, path, noun) {
  const hits = path.filter((id) => (nodes[id].classes ?? []).some((c) => String(c).toLowerCase().split(/[^a-z]+/).includes(noun)));
  return hits.length ? (noun === "country" ? hits[hits.length - 1] : hits[0]) : null;
}
// judge: nodes (the nest), subject (the subject's holon id, e.g. a birthplace), answer (string), asker (the asker's own holon id, or null)
export function judgeNest({ model, question, nodes, subject, answer, asker = null }) {
  const g = grainNounOfQuestion(model, question); if (!g.grain) return { verdict: null, why: `question grain unread: ${g.why}` };
  const P = pathOf(nodes, subject); if (!P.ok) return { verdict: null, why: P.why }; const path = P.path; const a = String(answer).trim().toLowerCase();
  const matches = path.filter((id) => String(nodes[id].label).toLowerCase() === a); if (!matches.length) return { verdict: "other", grain: g.grain, why: "the answer names no holon on the subject's path" };
  if (g.grain === "open") {
    const hit = matches[0]; let cut = path.length; if (asker != null) { const AP = pathOf(nodes, asker); if (AP.ok) { const i = sharedGround(path, AP.path); if (i >= 0) cut = i; } }
    return path.indexOf(hit) < cut ? { verdict: "same", grain: "open", why: "finer than the ground the asker already shares" } : { verdict: "already_held", grain: "open", why: "at or above the ground the asker already shares" };
  }
  const q = askedHolon(nodes, path, g.grain); if (q == null) return { verdict: null, grain: g.grain, why: `no holon named ${g.grain} on the subject's path` };
  const hit = matches.includes(q) ? q : matches[0];   // the question's grain resolves a string that names two holons
  const iq = path.indexOf(q), ih = path.indexOf(hit); return ih === iq ? { verdict: "same", grain: g.grain, why: "the asked holon" } : ih < iq ? { verdict: "roll_up", grain: g.grain, why: "inside the asked holon" } : { verdict: "too_coarse", grain: g.grain, why: "contains the asked holon" };
}
