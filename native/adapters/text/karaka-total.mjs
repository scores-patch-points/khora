// karaka-total.mjs — EVERY parse row gets exactly one Pāṇinian relation to its head. Total by construction.
//
// karaka-map.mjs names the nine kārakas and translates single rows. That leaves most rows unlabelled (a determiner,
// an adposition, an auxiliary carries no kāraka) and it cannot see the evidence that decides a role, which in a
// Figure language sits on ANOTHER row: the adposition or subordinator child (the English vibhakti), the passive
// auxiliary of the head (the voice), the first conjunct (coordination). This module reads the whole sentence's
// rows and gives every row one label from a CLOSED set, so the labelling is a total function of the reader's rows:
//
//   the nine kārakas (participants of the action, P. 1.4.23-55): kartṛ, karman, karaṇa, sampradāna, apādāna,
//     adhikaraṇa, kāla, hetu, prayojana
//   kāraka        a participant whose kāraka is NOT determined among the nine (P. 1.4.23 "kārake", the heading
//                 all nine stand under). Honest underspecification, never a guess dressed as a role.
//   kriyā         the action itself (the predication the sentence is about)
//   the relations that are not kārakas:
//     sambandha       a nominal's relation to a nominal; the remainder (P. 2.3.50 ṣaṣṭhī śeṣe)
//     viśeṣaṇa        qualifies a nominal (amod, det, nummod, acl, clf)
//     kriyāviśeṣaṇa   qualifies the action without being a participant (advmod; a marker-less advcl)
//     samānādhikaraṇa same referent, another description (appos)
//     sambodhana      address (vocative; P. 2.3.47)
//     vibhakti        the row that CARRIES its head's role (case, mark): the marker, not the participant
//     sahāyaka        auxiliary or copula (tense, mood, voice of the action)
//     samuccaya       the coordinator itself (cc)
//     samāsa          part of one word or name (flat, compound, fixed, goeswith)
//     vākya           a clause linked by juxtaposition (parataxis, list, dislocated, reparandum)
//     nipāta          particle or expletive (discourse, expl)
//     virāma          punctuation (a pause)
//     aniścita        undetermined: the parser itself did not commit (UD dep, or no deprel at all)
//
// THE MAP IS DECLARED, NOT MEASURED (like karaka-map.mjs). The givers: Pāṇini's Aṣṭādhyāyī for the roles and the
// heading; the Computational Paninian Grammar dependency scheme (AnnCorra, IIIT Hyderabad; the Hindi-Urdu Treebank
// labels k1..k7, r6, rh, rt, ccof, lwg__psp, rsym) as the precedent for labelling EVERY word of a sentence, kāraka or
// not. Totality is a property of the table (every UD v2 universal relation has an entry; the test enumerates them),
// not a claim of correctness: a total label can be wrong. Correctness needs a fixed external giver (a gold with
// roles), which this module does not have. `karakaCoverage` therefore reports the specific rate and the generic,
// contested and undetermined counts beside the 100%.
//
// Evidence order for one row (first that decides wins; `karakaVia` names it):
//   1. conj            -> the first conjunct's label (coordination shares the role; P. 2.3.46 sense of one vibhakti)
//   2. voice           -> nsubj/csubj of a passive head is karman (the patient expressed in the nominative: in
//                         Pāṇini's karmaṇi prayoga the patient is still karman); obl/agent marked "by" is kartṛ
//   3. deprel subtype  -> an explicit UD subtype (obl:agent, obl:tmod, advcl:cond, nmod:poss, ...)
//   4. marker          -> the row's case/mark child (+ its fixed children) looked up in the language's declared table;
//                         a phrase the table does not hold leaves the row generic with `marker_unlisted:<m>`
//   5. bare case       -> the row's own Case feat, ONLY when no adposition governs it (a governed case is the
//                         adposition's, not the role's: German "mit dem Messer" is Dat by government, karaṇa by role)
//   6. the relation    -> the base UD relation's default
// A language with no marker table reads markers as `no_marker_table:<stem>` (typed), never through English.

export const KARAKAS = Object.freeze(["kartṛ", "karman", "karaṇa", "sampradāna", "apādāna", "adhikaraṇa", "kāla", "hetu", "prayojana"]);

/** The closed label set with English aliases (the alias is a translation, never a second scheme). */
export const PANINI_LABELS = Object.freeze({
  "kartṛ": "agent", "karman": "patient", "karaṇa": "instrument", "sampradāna": "recipient", "apādāna": "source",
  "adhikaraṇa": "locus", "kāla": "time", "hetu": "cause", "prayojana": "purpose",
  "kāraka": "participant",
  "kriyā": "action",
  "sambandha": "relation", "viśeṣaṇa": "qualifier", "kriyāviśeṣaṇa": "adverbial", "samānādhikaraṇa": "apposition",
  "sambodhana": "address", "vibhakti": "role-marker", "sahāyaka": "auxiliary", "samuccaya": "coordinator",
  "samāsa": "compound-part", "vākya": "clause-link", "nipāta": "particle", "virāma": "pause", "aniścita": "undetermined",
});

const PARTICIPANT = new Set([...KARAKAS, "kāraka"]);
export const isParticipant = (label) => PARTICIPANT.has(label);

/** Every UD v2 universal relation (37) -> its default label. `null` for conj: it inherits (step 1). */
export const UD_RELATIONS = Object.freeze({
  root: "kriyā",
  nsubj: "kartṛ", csubj: "kartṛ",
  obj: "karman", ccomp: "karman", xcomp: "karman",
  iobj: "sampradāna",
  obl: "kāraka", orphan: "kāraka",
  nmod: "sambandha",
  advcl: "kriyāviśeṣaṇa", advmod: "kriyāviśeṣaṇa",
  acl: "viśeṣaṇa", amod: "viśeṣaṇa", nummod: "viśeṣaṇa", det: "viśeṣaṇa", clf: "viśeṣaṇa",
  appos: "samānādhikaraṇa",
  vocative: "sambodhana",
  case: "vibhakti", mark: "vibhakti",
  aux: "sahāyaka", cop: "sahāyaka",
  cc: "samuccaya",
  conj: null,
  flat: "samāsa", compound: "samāsa", fixed: "samāsa", goeswith: "samāsa",
  parataxis: "vākya", list: "vākya", dislocated: "vākya", reparandum: "vākya",
  discourse: "nipāta", expl: "nipāta",
  punct: "virāma",
  dep: "aniścita",
});

/** UD subtypes that decide a role outright (consistent with karaka-map.mjs KARAKA_MAP; passive subject corrected). */
export const UD_SUBTYPES = Object.freeze({
  "nsubj:pass": "karman", "csubj:pass": "karman", "nsubj:outer": "kartṛ",
  "obl:agent": "kartṛ", "obl:patient": "karman", "obl:instr": "karaṇa", "obl:benef": "sampradāna",
  "obl:from": "apādāna", "obl:source": "apādāna", "obl:loc": "adhikaraṇa", "obl:lmod": "adhikaraṇa",
  "obl:tmod": "kāla", "nmod:tmod": "kāla", "advcl:tcl": "kāla",
  "obl:cause": "hetu", "advcl:caus": "hetu", "advcl:cond": "hetu", "advcl:consec": "hetu",
  "obl:purpose": "prayojana", "obl:goal": "prayojana", "advcl:fin": "prayojana",
  "nmod:poss": "sambandha", "nmod:gen": "sambandha", "det:poss": "sambandha",
  "acl:relcl": "viśeṣaṇa", "compound:prt": "samāsa", "aux:pass": "sahāyaka",
});

/** Bare-case vibhakti (no adposition governs the row). Ordered candidates: the first is assigned, the rest are the contested band. */
export const CASE_ROLES = Object.freeze({
  Ins: ["karaṇa"], Dat: ["sampradāna"], Abl: ["apādāna"], Loc: ["adhikaraṇa", "kāla"],
  Ine: ["adhikaraṇa"], Ade: ["adhikaraṇa"], Sup: ["adhikaraṇa"], Ela: ["apādāna"], Del: ["apādāna"],
  Ill: ["karman", "sampradāna"], All: ["sampradāna", "karman"], Lat: ["karman", "sampradāna"],
  Tem: ["kāla"], Cau: ["hetu"], Ben: ["sampradāna"], Gen: ["sambandha"], Voc: ["sambodhana"],
});

// ── the marker tables (declared per language; the giver is named with each) ─────────────────────────────────────
// Keys are the marker phrase read off the rows: the case/mark child's lemma plus its `fixed` children, lowercased.
// Values are ordered candidates (first assigned; more than one = contested, the band reported with its width).
// English: the prepositions and subordinators ARE the vibhakti of a Figure language. Giver: Pāṇini's definitions
// applied to the English function words (1.4.24 apādāna "fixed point of departure", 1.4.32 sampradāna, 1.4.42 karaṇa
// "most effective means", 1.4.45 adhikaraṇa "the substratum", 2.3.23 hetu, 3.3.10 tumun for purpose); the readings of
// each English marker follow the standard senses in CGEL (Huddleston & Pullum 2002, ch. 7 and 8).
const ENG_CASE = {
  in: ["adhikaraṇa", "kāla"], at: ["adhikaraṇa", "kāla"], on: ["adhikaraṇa", "kāla"], inside: ["adhikaraṇa"],
  within: ["adhikaraṇa", "kāla"], among: ["adhikaraṇa"], amongst: ["adhikaraṇa"], near: ["adhikaraṇa"],
  under: ["adhikaraṇa"], over: ["adhikaraṇa", "kāla"], above: ["adhikaraṇa"], below: ["adhikaraṇa"],
  beneath: ["adhikaraṇa"], beside: ["adhikaraṇa"], between: ["adhikaraṇa", "kāla"], behind: ["adhikaraṇa"],
  across: ["adhikaraṇa"], along: ["adhikaraṇa"], around: ["adhikaraṇa", "kāla"], beyond: ["adhikaraṇa"],
  upon: ["adhikaraṇa"], throughout: ["adhikaraṇa", "kāla"], about: ["adhikaraṇa"], concerning: ["adhikaraṇa"],
  regarding: ["adhikaraṇa"], "with regard": ["adhikaraṇa"], "with respect": ["adhikaraṇa"],
  during: ["kāla"], after: ["kāla"], before: ["kāla"], until: ["kāla"], till: ["kāla"], since: ["kāla", "hetu"],
  from: ["apādāna"], "out of": ["apādāna"], "away from": ["apādāna"], off: ["apādāna"],
  with: ["karaṇa"], by: ["karaṇa", "adhikaraṇa"], through: ["karaṇa", "adhikaraṇa"], via: ["karaṇa"],
  "by means": ["karaṇa"],
  to: ["sampradāna", "karman"], toward: ["sampradāna", "karman"], towards: ["sampradāna", "karman"],
  into: ["karman", "adhikaraṇa"], onto: ["karman", "adhikaraṇa"],
  for: ["sampradāna", "prayojana", "kāla"],
  because: ["hetu"], "because of": ["hetu"], "due to": ["hetu"], "owing to": ["hetu"], "on account": ["hetu"],
  of: ["sambandha"],
};
const ENG_MARK = {
  because: ["hetu"], since: ["kāla", "hetu"], as: ["kāla", "hetu"], if: ["hetu"], unless: ["hetu"],
  "in case": ["hetu"], when: ["kāla"], whenever: ["kāla"], while: ["kāla"], after: ["kāla"], before: ["kāla"],
  until: ["kāla"], till: ["kāla"], once: ["kāla"],
  "in order": ["prayojana"], "so that": ["prayojana"], "so as": ["prayojana"], to: ["prayojana"], lest: ["prayojana"],
  although: ["kriyāviśeṣaṇa"], though: ["kriyāviśeṣaṇa"], whereas: ["kriyāviśeṣaṇa"], like: ["kriyāviśeṣaṇa"],
};
// Mandarin and Classical Chinese: the particle table karaka-map.mjs already declares (GROUND_PARTICLE_KARAKA),
// restated by role so both tables answer the same question. 的 is sambandha, never a kāraka.
const ZH_CASE = {
  "把": ["karman"], "被": ["kartṛ"], "給": ["sampradāna"], "给": ["sampradāna"], "向": ["sampradāna"], "從": ["apādāna"], "从": ["apādāna"],
  "在": ["adhikaraṇa"], "於": ["adhikaraṇa"], "于": ["adhikaraṇa"], "用": ["karaṇa"], "以": ["karaṇa"],
  "時": ["kāla"], "时": ["kāla"], "因": ["hetu"], "因為": ["hetu"], "因为": ["hetu"], "為": ["prayojana"], "为": ["prayojana"],
  "為了": ["prayojana"], "为了": ["prayojana"], "的": ["sambandha"],
};

export const MARKER_TABLES = Object.freeze({
  eng: Object.freeze({ case: Object.freeze(ENG_CASE), mark: Object.freeze(ENG_MARK), passiveAgent: "by", giver: "Pāṇini 1.4.24-45, 2.3.23, 3.3.10 applied to English function words; senses per CGEL ch. 7-8" }),
  zh: Object.freeze({ case: Object.freeze(ZH_CASE), mark: Object.freeze(ZH_CASE), passiveAgent: null, giver: "karaka-map.mjs GROUND_PARTICLE_KARAKA (被 introduces the agent of a passive)" }),
});
const STEM_TABLE = { eng: "eng", en: "eng", zh: "zh", cmn: "zh", lzh: "zh", zho: "zh" };
export const markerTableFor = (stem) => MARKER_TABLES[STEM_TABLE[String(stem ?? "").toLowerCase()]] ?? null;

const attr = (feats, key) => { if (!feats || feats === "_") return null; for (const p of String(feats).split("|")) { const i = p.indexOf("="); if (i > 0 && p.slice(0, i) === key) return p.slice(i + 1); } return null; };
const baseOf = (deprel) => { const d = String(deprel ?? ""); const i = d.indexOf(":"); return i < 0 ? d : d.slice(0, i); };
const low = (r) => String(r?.lemma ?? r?.form ?? "").toLowerCase();

/**
 * karakaRows(rows, { stem }) — label every row of ONE sentence. Returns new row objects with:
 *   panini          one label of PANINI_LABELS (never null)
 *   karaka          one of the nine KARAKAS, or null (a non-kāraka relation, or a generic participant)
 *   karakaVia       the evidence that decided it ("conj", "voice", "deprel-subtype", "marker:<m>", "case:<C>", "relation:<d>", ...)
 *   karakaContested the other candidates when the evidence was ambiguous (omitted when it was not)
 */
export function karakaRows(rows, { stem = "eng" } = {}) {
  if (!Array.isArray(rows)) return rows;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const kids = new Map();
  for (const r of rows) { if (!kids.has(r.head)) kids.set(r.head, []); kids.get(r.head).push(r); }
  for (const list of kids.values()) list.sort((a, b) => a.id - b.id);
  const childrenOf = (id) => kids.get(id) ?? [];
  const passive = (id) => childrenOf(id).some((c) => c.deprel === "aux:pass" || c.deprel === "nsubj:pass" || c.deprel === "csubj:pass");
  const table = markerTableFor(stem);

  // the marker phrases on a row: each case/mark child with its fixed children, in surface order
  const markersOf = (r) => {
    const out = [];
    for (const c of childrenOf(r.id)) {
      const b = baseOf(c.deprel);
      if (b !== "case" && b !== "mark") continue;
      const fixed = childrenOf(c.id).filter((f) => baseOf(f.deprel) === "fixed").map(low);
      out.push({ kind: b, phrase: [low(c), ...fixed].join(" "), head: low(c) });
    }
    return out;
  };

  const decide = (r) => {
    const d = String(r.deprel ?? "");
    const b = baseOf(d);
    if (!d) return { panini: "aniścita", via: "no_deprel" };
    if (b === "conj") return null; // inherits after the first pass
    // 2. voice
    if ((b === "nsubj" || b === "csubj") && passive(r.head)) return { panini: "karman", via: "voice:passive-subject" };
    // 3. subtype
    if (UD_SUBTYPES[d]) return { panini: UD_SUBTYPES[d], via: "deprel-subtype" };
    // 4-5. obliques and adverbial clauses: the marker, then bare case
    if (b === "obl" || b === "nmod" || b === "advcl" || b === "orphan") {
      const ms = markersOf(r);
      if (ms.length) {
        if (!table) return { panini: b === "nmod" ? "sambandha" : UD_RELATIONS[b], via: `no_marker_table:${stem}` };
        // two marker rows that are one marker ("out" + "of" attached separately) are tried as one phrase first
        if (ms.length > 1) ms.unshift({ kind: ms[0].kind, phrase: ms.map((m) => m.phrase).join(" "), head: ms[0].head, joined: true });
        for (const m of ms) {
          if (!m.joined && table.passiveAgent && m.head === table.passiveAgent && b === "obl" && passive(r.head)) return { panini: "kartṛ", via: `voice:agent-marker:${m.phrase}` };
          const t = m.kind === "case" ? table.case : table.mark, other = m.kind === "case" ? table.mark : table.case;
          if (m.joined && !t[m.phrase] && !other[m.phrase]) continue;
          // the parser attaches some prepositions as `mark` ("by doing", "for him to go"): the other table is asked second
          const tries = m.joined ? [[t, m.phrase], [other, m.phrase]] : [[t, m.phrase], [t, m.head], [other, m.phrase], [other, m.head]];
          const hit = tries.find(([tb, key]) => tb[key]);
          const cands = hit ? hit[0][hit[1]] : null;
          // ṣaṣṭhī (sambandha) is a relation between NOMINALS: on a verb's oblique the marker does not decide the role
          if (cands && cands[0] === "sambandha" && b !== "nmod") continue;
          if (cands) return { panini: cands[0], via: `marker:${hit[1]}`, contested: cands.length > 1 ? cands.slice(1) : null };
        }
        return { panini: b === "nmod" ? "sambandha" : UD_RELATIONS[b], via: `marker_unlisted:${ms.filter((m) => !m.joined).map((m) => m.phrase).join("+")}` };
      }
      const c = attr(r.feats, "Case");
      if (c && CASE_ROLES[c] && b !== "advcl") {
        const cands = CASE_ROLES[c];
        return { panini: cands[0], via: `case:${c}`, contested: cands.length > 1 ? cands.slice(1) : null };
      }
    }
    if (attr(r.feats, "Case") === "Voc") return { panini: "sambodhana", via: "case:Voc" };
    const def = UD_RELATIONS[b];
    if (def) return { panini: def, via: `relation:${b}` };
    return { panini: "aniścita", via: `relation_unknown:${d}` };
  };

  const label = new Map();
  for (const r of rows) { const x = decide(r); if (x) label.set(r.id, x); }
  // 1. conj inherits from its first conjunct (chains resolve in a few passes; a cycle or a broken head is undetermined)
  for (let pass = 0; pass < rows.length && label.size < rows.length; pass++) {
    for (const r of rows) {
      if (label.has(r.id)) continue;
      const h = byId.get(r.head);
      if (!h) { label.set(r.id, { panini: "aniścita", via: "conj:head_missing" }); continue; }
      const hl = label.get(h.id);
      if (hl) label.set(r.id, { panini: hl.panini, via: "conj", contested: hl.contested ?? null });
    }
  }
  return rows.map((r) => {
    const x = label.get(r.id) ?? { panini: "aniścita", via: "conj:unresolved" };
    const out = { ...r, panini: x.panini, karaka: KARAKAS.includes(x.panini) ? x.panini : null, karakaVia: x.via };
    if (x.contested && x.contested.length) out.karakaContested = x.contested;
    else delete out.karakaContested;
    return out;
  });
}

/** Coverage over many sentences' rows: the 100% (labelled) beside the honest parts (specific, generic, contested, undetermined). */
export function karakaCoverage(rowsList) {
  const c = { rows: 0, labelled: 0, participants: 0, specific: 0, generic: 0, contested: 0, undetermined: 0, byLabel: {}, unlisted: {} };
  for (const rows of rowsList ?? []) for (const r of rows ?? []) {
    c.rows++;
    if (r.panini && PANINI_LABELS[r.panini]) c.labelled++;
    c.byLabel[r.panini ?? "(none)"] = (c.byLabel[r.panini ?? "(none)"] ?? 0) + 1;
    if (isParticipant(r.panini)) { c.participants++; if (r.panini === "kāraka") c.generic++; else c.specific++; }
    if (r.karakaContested) c.contested++;
    if (r.panini === "aniścita") c.undetermined++;
    const v = String(r.karakaVia ?? "");
    if (v.startsWith("marker_unlisted:")) { const m = v.slice("marker_unlisted:".length); c.unlisted[m] = (c.unlisted[m] ?? 0) + 1; }
  }
  c.labelledRate = c.rows ? c.labelled / c.rows : null;
  c.specificRate = c.participants ? c.specific / c.participants : null;
  return c;
}

export const PANINI_GIVER = "Pāṇini, Aṣṭādhyāyī (the nine kārakas and the heading 1.4.23 kārake; ṣaṣṭhī śeṣe 2.3.50); the Computational Paninian Grammar dependency scheme (AnnCorra, IIIT Hyderabad; Hindi-Urdu Treebank) as the precedent for a label on every word; declared, not measured";
