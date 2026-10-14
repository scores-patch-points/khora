// organs/options.js — the OPTIONS of an issue, and whether they exclude one another. Pure; the parser model is injected.
//
// The user, 2026-10-14, to every archon: "so what must we do?" The archons and the routing session agreed on one thing above the rest:
// exclusivity between options is NEVER inferred from co-occurrence. It is nominated from what the pages themselves declare, carries the
// span that declared it, and can be REFUTED by the record but never established by it (Clark: a declared affordance ledger; Frege and
// Tarski: a stated relation; Nagarjuna: refute, never assert; Shizhen: an authored placement; the routing session: hl.js declareFunctional,
// "a corpus can refute single-valuedness and never establish it").
//
//   discoverOptions({ texts, model, topicNames }) → [{ id, names, pages, declared: [{ pinax, text, marker, address? }] }]
//   exclusivity(options, positions)               → [{ a, b, status: "nominated" | "refuted", declared, refuted_by }]
//   cornersOf(option, positions)                  → Nagarjuna's four corners for ONE option: for / against / both / neither
//   spectrum(...)                                 → options × holders × corners, with the implied (never asserted) cross-option stance
//
// WHAT COUNTS AS A DECLARATION (a closed class, English, disclosed — the same discipline as the stance frames): the page puts the topic
// and another noun phrase on either side of a marker of alternation or comparison (versus, rather than, instead of, as opposed to, than,
// compared with/to), or names a rival ("a competing/alternative/rival/separate proposal would make X permanent"). An option needs two
// independent pages to declare it (the house's one-witness-is-a-coincidence convention, as for topic aliases).
import { claimFromRows, readRows } from "./claim-realize.js";
import { splitSentences } from "../adapters/text/spans.js";
import { verdictOfSupport } from "../interpretation/hl.js";

export const ALTERNATION_MARKERS = Object.freeze({
  giver: "declared English closed class (options.js): markers of alternation or comparison between two noun phrases",
  between: Object.freeze(["versus", "vs", "vs.", "rather than", "instead of", "as opposed to", "compared with", "compared to", "than"]),
  rival: Object.freeze(["competing", "alternative", "rival", "separate", "opposing"]),
});

const STOP = new Set(["the", "a", "an", "this", "that", "these", "those", "of", "for", "in", "on", "to", "by", "with", "and", "or", "but", "because", "while", "would", "will", "could", "is", "are", "was", "be", "its", "their", "his", "her", "which", "that"]);
const clean = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim();
const noDet = (s) => clean(s).replace(/^(the|a|an|this|that|these|those)\s+/, "");
/** Order-free identity of a phrase: "standard time permanent" and "permanent standard time" are one option. */
export const optionKey = (s) => noDet(s).split(" ").filter((w) => w && !STOP.has(w)).sort().join(" ");

const phraseAround = (words, from, dir, max = 6) => {
  const out = [];
  // a measurement between the marker and the phrase ("compared to 42 for standard time") is not the phrase: skip leading numbers and
  // closed-class words before the phrase begins
  while (from >= 0 && from < words.length && (/^\d[\d.,]*$/.test(words[from]) || STOP.has(words[from]))) from += dir;
  for (let i = from; i >= 0 && i < words.length && out.length < max; i += dir) {
    const w = words[i];
    if (STOP.has(w) && out.length) break;
    if (/^[,;:.()]$/.test(w)) break;
    if (STOP.has(w)) continue;
    out.push(w);
  }
  return dir < 0 ? out.reverse() : out;
};

export function discoverOptions({ texts, model, topicNames = [], skip = new Set(), minPages = 1 }) {
  const topicKeys = new Set(topicNames.map(optionKey));
  const found = new Map(); // key -> { names:Set, pages:Set, declared:[] }
  // An option is a NOUN PHRASE: every token of it ADJ/NOUN/PROPN/NUM and its head a noun, by the parse (a verb or a preposition inside it
  // means the window ran past the phrase: "make permanent standard time", "according standard time").
  const isNP = (name) => {
    if (!model) return true;
    let rows; try { rows = readRows(model, name); } catch { return false; }
    return rows.length > 0 && rows.every((r) => ["ADJ", "NOUN", "PROPN", "NUM"].includes(r.upos)) && ["NOUN", "PROPN"].includes(rows[rows.length - 1].upos);
  };
  const note = (name, pinax, text, marker) => {
    if (!isNP(noDet(name))) return;
    const k = optionKey(name);
    // an option is named by words: a bare number ("42% for standard time") is a measurement, not an alternative
    if (!k || topicKeys.has(k) || !/\p{L}{3,}/u.test(k)) return;
    // a phrase that is merely the topic with more words is the topic
    if ([...topicKeys].some((t) => t && (k.includes(t) || t.includes(k)))) return;
    if (!found.has(k)) found.set(k, { names: new Set(), pages: new Set(), declared: [] });
    const o = found.get(k); o.names.add(noDet(name)); o.pages.add(pinax); o.declared.push({ pinax, text: text.slice(0, 240), marker });
  };
  for (const [pinax, text] of texts) {
    if (skip.has(pinax)) continue;
    for (const sn of splitSentences(text)) {
      const t = sn.text.trim();
      if (t.length < 25 || t.length > 400) continue;
      const low = clean(t);
      if (!topicNames.some((n) => low.includes(n))) continue;
      const words = low.split(" ");
      // (a) the topic and another phrase either side of a marker
      for (const m of ALTERNATION_MARKERS.between) {
        const mw = m.split(" ");
        for (let i = 0; i + mw.length <= words.length; i++) {
          if (words.slice(i, i + mw.length).join(" ") !== m.replace(/\.$/, "")) continue;
          if (m === "than" && words[i - 1] === "rather") continue; // "rather than" is one marker, read once
          const left = phraseAround(words, i - 1, -1).join(" "), right = phraseAround(words, i + mw.length, +1).join(" ");
          const lt = topicNames.some((n) => left.includes(n) || n.includes(left) && left.length > 3), rt = topicNames.some((n) => right.includes(n) || n.includes(right) && right.length > 3);
          if (lt && right && !rt) note(right, pinax, t, m);
          else if (rt && left && !lt) note(left, pinax, t, m);
        }
      }
      // (b) a named rival: "A competing proposal would make standard time permanent"
      if (ALTERNATION_MARKERS.rival.some((r) => words.includes(r)) && model) {
        let rows; try { rows = readRows(model, t); } catch { rows = []; }
        const root = rows.find((r) => r.deprel === "root" && r.upos === "VERB") ?? rows.find((r) => r.upos === "VERB");
        if (root) {
          const c = claimFromRows(t, "x", rows, { predForm: root.form, predAt: root.at });
          if (c && c.obj && !c.untrusted) {
            const xc = rows.find((r) => r.head === c.rows.find((x) => x.id === c.obj.id)?.head && r.deprel === "xcomp");
            const name = `${xc ? xc.form + " " : ""}${t.slice(c.obj.from, c.obj.to)}`;
            note(name, pinax, t, "rival");
          }
        }
      }
    }
  }
  const out = [];
  for (const [k, o] of found) {
    if (o.pages.size < minPages) continue; // `pages` is reported on the option and on every exclusivity edge: one declarer is one witness
    out.push({ id: `option:${k}`, key: k, names: [...o.names], pages: [...o.pages], declared: o.declared });
  }
  // one option under several wordings: a phrase whose words are a subset of another's is that option ("standard time" ⊂ "permanent standard time")
  const merged = [];
  for (const o of out.sort((a, b) => b.key.split(" ").length - a.key.split(" ").length)) {
    const into = merged.find((m) => o.key.split(" ").every((w) => m.key.split(" ").includes(w)));
    if (into) { into.names = [...new Set([...into.names, ...o.names])]; into.pages = [...new Set([...into.pages, ...o.pages])]; into.declared.push(...o.declared); } else merged.push(o);
  }
  return merged.sort((a, b) => b.pages.length - a.pages.length);
}

const nameOfHolder = (x) => x.holder_display ?? x.holder;

/**
 * Exclusivity between the topic and each option: NOMINATED (a page declared the alternation) and defeasible. It is REFUTED when a named
 * holder stands on the pro pole of BOTH (a record that has someone supporting both says they are not exclusive for that holder). A
 * refutation is kept with the holders and spans; a nomination is never promoted to "established".
 */
export function exclusivity(options, positions, { topicId = "topic" } = {}) {
  const out = [];
  for (const o of options) {
    const both = new Map();
    for (const p of positions.filter((x) => x.option === topicId && x.pole === "-")) both.set(nameOfHolder(p), p);
    // pole "-" is the pro side relative to the asked pole "+" ("oppose"): a holder whose stance on the topic and on the option is the SAME
    // pole is the refutation evidence (supports both, or opposes both)
    const refuters = [];
    for (const p of positions.filter((x) => x.option === o.id)) {
      const q = positions.find((x) => x.option === topicId && nameOfHolder(x) === nameOfHolder(p) && x.pole === p.pole);
      if (q) refuters.push({ holder: nameOfHolder(p), pole: p.pole, topic_span: q.span, option_span: p.span });
    }
    out.push({ a: topicId, b: o.id, status: refuters.length ? "refuted" : "nominated", declared: o.declared.map((d) => ({ pinax: d.pinax, marker: d.marker })), declared_by_pages: o.pages.length, refuted_by: refuters, giver: "page declarations (options.js); never established by the record" });
  }
  return out;
}

/**
 * Nagarjuna's four corners for one option, from hl.js verdictOfSupport (the ONE lattice): FOR (a named holder on the pro pole),
 * AGAINST (a named holder on the con pole). is = for only; is-not = against only; both = both camps present; neither = none.
 * `proPole` is the pole that means "for the option" ("-" when the question asked who OPPOSES, since "+" is the asked pole).
 */
export function cornersOf(optionId, positions, { proPole = "-", conPole = "+" } = {}) {
  const rows = positions.filter((x) => x.option === optionId && x.holder && !x.pronoun);
  const forRows = rows.filter((x) => x.pole === proPole), againstRows = rows.filter((x) => x.pole === conPole);
  const forH = [...new Set(forRows.map(nameOfHolder))];
  const againstH = [...new Set(againstRows.map(nameOfHolder))];
  // INDEPENDENT witnesses (Bukhari: a shared chain is one witness): the same sentence carried by several pages counts once
  const fp = (x) => String(x.text ?? x.span).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const nFor = new Set(forRows.map(fp)).size, nAgainst = new Set(againstRows.map(fp)).size;
  const verdict = verdictOfSupport(forH.length > 0, againstH.length > 0);
  const says = { bound: "is", contradicted: "is-not", contested: "both", unbound: "neither" }[verdict] ?? verdict;
  return { option: optionId, verdict, says, for: forH, against: againstH, independent: { for: nFor, against: nAgainst } };
}

/**
 * The spectrum: every option with its corners, its holders, and the CROSS-OPTION reading a nominated exclusivity permits. A holder who
 * is against the topic and has said nothing of an exclusive option is `consistent_with` it (typed, with the declaring spans); that is
 * a consequence of the NOMINATED edge and is never emitted as the holder's own stance.
 */
export function spectrum({ perspectives, options, topicId = "topic", proPole = "-", conPole = "+" }) {
  const positions = perspectives.positions;
  const ex = exclusivity(options, positions, { topicId });
  const ids = [topicId, ...options.map((o) => o.id)];
  const corners = Object.fromEntries(ids.map((id) => [id, cornersOf(id, positions, { proPole, conPole })]));
  const implied = [];
  for (const e of ex.filter((x) => x.status === "nominated")) {
    const direct = new Set(positions.filter((x) => x.option === e.b).map(nameOfHolder));
    for (const p of positions.filter((x) => x.option === topicId && x.pole === conPole && x.holder && !x.pronoun)) {
      const h = nameOfHolder(p);
      if (!direct.has(h)) implied.push({ holder: h, option: e.b, relation: "consistent_with", because: { opposes: topicId, span: p.span, exclusivity: e.declared.map((d) => d.marker) }, asserted: false });
    }
  }
  return { options: ids, corners, exclusivity: ex, implied };
}
