// place-grain.js — what counts for the question (identity/novels/PREREG-ROUND27.md).
// Two things decide whether "Topeka" or "Kansas" is the right answer: the GRAIN the question asks for ("which state", "which city"), and what the asker already HOLDS.
// Containment (Topeka is inside Kansas, inside the United States) comes from a giver's chain; the grain is read from the question by the reader's own parser; nothing here guesses a place from a string.
import { tokenize, analyse } from "./english-parser.js";
export const LEVELS = Object.freeze(["settlement", "admin1", "country"]);   // finest to coarsest
export const LEVEL_OF_NOUN = Object.freeze({ city: "settlement", town: "settlement", village: "settlement", state: "admin1", province: "admin1", region: "admin1", prefecture: "admin1", country: "country", nation: "country" });
// the verdicts: same (the asked level, the same entity); roll_up (finer than asked, inside the asked entity: it answers more than was asked); too_coarse (coarser than asked: a gap, not wrong);
// already_held (true, but the asker holds it: nothing fresh); other (names nothing in the subject's chain)
export const VERDICTS = Object.freeze(["same", "roll_up", "too_coarse", "already_held", "other"]);

// The grain a question asks for, read by the parser: the noun a wh-determiner ("which", "what") governs; else the one grain noun the question names; else "open" for a bare "where" (the asker's holdings decide); else null.
export function grainOfQuestion(model, text) {
  const toks = tokenize(String(text)); if (!toks.length) return { grain: null, why: "empty" };
  const rows = analyse(model, toks.map((t) => t.form));
  const level = (r) => LEVEL_OF_NOUN[String(r.lemma ?? r.form).toLowerCase()] ?? null;
  for (const r of rows) { const lv = level(r); if (lv && /^(NOUN|PROPN)$/.test(r.upos) && rows.some((d) => d.head === r.id && /^(which|what)$/i.test(d.form))) return { grain: lv, why: "wh-determiner governs the noun" }; }
  const named = [...new Set(rows.filter((r) => /^(NOUN|PROPN)$/.test(r.upos)).map(level).filter(Boolean))];
  if (named.length === 1) return { grain: named[0], why: "the one grain noun the question names" };
  if (named.length > 1) return { grain: null, why: "more than one grain noun" };
  if (rows.some((r) => /^where$/i.test(r.form))) return { grain: "open", why: "bare where" };
  return { grain: null, why: "no grain" };
}

// The levels of a place chain: chain = { id: { label, classes: ["label|Qid", ...] } } as the giver gives it, birthplace id. Returns { settlement, admin1, country } = { id, label } or null (and why).
const ADMIN1_Q = new Set(["Q35657", "Q10864048", "Q34876", "Q3336843", "Q107390", "Q5852411", "Q1221156", "Q150093", "Q48352", "Q1799794", "Q15304003"]); const COUNTRY_Q = new Set(["Q6256", "Q3624078", "Q7275", "Q112099", "Q1520223"]);
const ADMIN1_RE = /^(state of|region of|province of|prefecture of|first-level administrative|federal subject|constituent country|autonomous community|federated state|state of the united states|states? of)/i; const COUNTRY_RE = /^(country|sovereign state|island country)$/i;
export function levelsOfChain(chain, placeId, placeLabel = null) {
  const out = { settlement: null, admin1: null, country: null }; const entries = Object.entries(chain ?? {});
  const is = (cls, q, re) => cls.some((c) => { const [lab, id] = c.split("|"); return q.has(id) || re.test(lab); });
  const countries = entries.filter(([, v]) => is(v.classes ?? [], COUNTRY_Q, COUNTRY_RE) && !is(v.classes ?? [], new Set(["Q3336843"]), /^constituent country/i));
  const admins = entries.filter(([id, v]) => is(v.classes ?? [], ADMIN1_Q, ADMIN1_RE) && !countries.some(([cid]) => cid === id));
  if (countries.length !== 1) return { ...out, why: countries.length ? "more than one country" : "no country in the chain" };
  if (admins.length !== 1) return { ...out, why: admins.length ? "more than one first-level division" : "no first-level division in the chain" };
  const [cid, cv] = countries[0], [aid, av] = admins[0]; if (placeId === aid || placeId === cid) return { ...out, why: "the birthplace is itself the division or the country" };
  out.country = { id: cid, label: cv.label }; out.admin1 = { id: aid, label: av.label }; out.settlement = { id: placeId, label: placeLabel ?? chain[placeId]?.label ?? null }; if (!out.settlement.label) return { ...out, settlement: null, why: "no label for the birthplace" }; return out;
}

// The judge. question: the text; model: the parser; levels: levelsOfChain's result; answer: the string; holdings: levels the asker already holds (a subset of LEVELS).
export function judge({ model, question, levels, answer, holdings = [] }) {
  const g = grainOfQuestion(model, question); if (!g.grain) return { verdict: null, why: `question grain unread: ${g.why}` };
  const a = String(answer).trim().toLowerCase(); const hit = LEVELS.find((L) => levels[L] && String(levels[L].label).toLowerCase() === a);
  if (!hit) return { verdict: "other", grain: g.grain, why: "the answer names nothing in the subject's chain" };
  const rank = (L) => LEVELS.indexOf(L);
  if (g.grain === "open") { const held = holdings.filter((L) => LEVELS.includes(L)); const finest = held.length ? Math.min(...held.map(rank)) : LEVELS.length; return rank(hit) < finest ? { verdict: "roll_up" === "x" ? null : "same", grain: "open", level: hit, why: "finer than anything the asker holds: fresh" } : { verdict: "already_held", grain: "open", level: hit, why: "the asker already holds this level or a finer one" }; }
  if (hit === g.grain) return { verdict: "same", grain: g.grain, level: hit, why: "the asked level" };
  return rank(hit) < rank(g.grain) ? { verdict: "roll_up", grain: g.grain, level: hit, why: "finer than asked: rolls up into the asked entity" } : { verdict: "too_coarse", grain: g.grain, level: hit, why: "coarser than asked" };
}
