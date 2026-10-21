// claim-frame.js — the FRAME a sentence's claim rests on, read from EOTRich@1 records (the-fold/eot-notation.js: NL -> grammar -> EOT).
// A frame says what a string cue cannot: whether the clause is NEGATED ("we did not enter into"), carries a MODAL on a verb of making ("we may enter into"), is about the relationship ENDING
// ("we terminated"), and which way the counterparty sits ("granted TO X" is a recipient, "licensed FROM X" a source). It is evidence a reader can inspect, never a verdict.
//
// Everything is read from every verb of the clause, not only the root, because a legal sentence often defeats the parser's choice of root (a date, a defined term).
// The verb sets are DECLARED defaults (agreement verbs, ending verbs, English modals); a caller reading another register or language passes its own `vocab`.
// Origin: EO-terminal core/frame.mjs (measured there: every planted negation, modality, ending and direction edit caught on 44 real filing sentences, 0 false alarms; the holodeck reader scored 0/32 on the same edits).
export const DEFAULT_VOCAB = Object.freeze({
  modals: ["may", "might", "could", "would", "will", "shall", "should", "can", "must"],
  creation: ["enter", "sign", "execute", "grant", "license", "lease", "sublease", "purchase", "sell", "engage", "retain", "appoint", "agree", "acquire", "amend"],
  ending: ["terminate", "expire", "cancel", "rescind", "end", "cease", "withdraw"],
  negators: ["not", "never", "no", "neither", "nor"],
});
const lemmaOf = (n) => String(n?.lemma ?? "").toLowerCase();

/** frameFromRecords(recs, aliases, { vocab }) -> frame | null. `recs` are EOTRich@1 records of one sentence; `aliases` are names of the counterparty ([] reads the clause without one). */
export function frameFromRecords(recs, aliases = [], { vocab = DEFAULT_VOCAB } = {}) {
  const MOD = new Set(vocab.modals), CREATION = new Set(vocab.creation), ENDING = new Set(vocab.ending), NEG = new Set(vocab.negators);
  const want = aliases.map((a) => String(a).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)[0]).filter(Boolean);
  for (const r of recs ?? []) {
    const m = r.meaning, nodes = m?.nodes ?? [], arcs = m?.arcs ?? [], byKey = new Map(nodes.map((n) => [n.key, n])), parentOf = new Map();
    for (const a of arcs) if (a.from != null) parentOf.set(a.to, a);
    const rootArc = arcs.find((a) => a.from == null), root = rootArc && byKey.get(rootArc.to);
    if (!root) continue;
    const targets = nodes.filter((n) => want.includes(lemmaOf(n)));
    if (!targets.length && want.length) continue;
    const markerLemma = (k) => (m.markers ?? []).find((x) => x.key === k)?.lemma;
    const chainOf = (t) => { const out = []; let k = t.key; const seen = new Set(); while (k != null && !seen.has(k)) { seen.add(k); const a = parentOf.get(k), n = byKey.get(k); if (!a) break; const preps = (n?.markers ?? []).map(markerLemma).filter(Boolean).map((x) => String(x).toLowerCase()); out.push({ rel: a.rel, lemma: lemmaOf(n), preps }); k = a.from; } return out; };
    // the name may occur twice ("the Vanda License Agreement ... licensed from Vanda"): the occurrence that is an ARGUMENT marked by from/to is the counterparty
    const withDir = targets.map((t) => ({ t, c: chainOf(t) })).find(({ t, c }) => [...(t.markers ?? []).map(markerLemma), ...c.flatMap((x) => x.preps)].some((x) => ["from", "to"].includes(String(x).toLowerCase())));
    const pick = withDir ?? (targets[0] ? { t: targets[0], c: chainOf(targets[0]) } : null), target = pick?.t ?? null, chain = pick?.c ?? [];
    const isVerb = (n) => /^(VERB|AUX)$/i.test(String(n.upos ?? "")) || CREATION.has(lemmaOf(n)) || ENDING.has(lemmaOf(n));
    const mk = (n) => (n.markers ?? []).map(markerLemma).filter(Boolean).map((x) => String(x).toLowerCase());
    const feat = (n, name) => (n.feats ?? []).find((f) => f.name === name)?.value ?? null;
    const negArcs = arcs.filter((a) => { const c = byKey.get(a.to), h = byKey.get(a.from); return h && c && isVerb(h) && /advmod|det/.test(a.rel) && ((c.feats ?? []).some((f) => f.name === "Polarity" && f.value === "Neg") || NEG.has(lemmaOf(c))); });
    const verbsAll = nodes.filter(isVerb);
    const modal = [...new Set(verbsAll.filter((n) => CREATION.has(lemmaOf(n))).flatMap((n) => mk(n).filter((x) => MOD.has(x))))];
    const ending = verbsAll.some((n) => ENDING.has(lemmaOf(n)) && (feat(n, "Tense") === "Past" || feat(n, "Voice") === "Pass" || feat(n, "VerbForm") === "Part"));
    const subject = arcs.filter((a) => /^nsubj/.test(a.rel) && isVerb(byKey.get(a.from) ?? {})).map((a) => lemmaOf(byKey.get(a.to)));
    const ownPreps = target ? mk(target).filter((x) => !["the", "a", "an", "any", "into"].includes(x)) : [];
    const preps = [...ownPreps, ...chain.flatMap((c) => c.preps)];
    return {
      root: { lemma: lemmaOf(root), tense: feat(root, "Tense"), voice: feat(root, "Voice"), form: feat(root, "VerbForm") },
      modal, negated: negArcs.length > 0, subject, creation: verbsAll.some((n) => CREATION.has(lemmaOf(n))), ending, verbs: verbsAll.map(lemmaOf), parsedRecords: recs.length,
      counterparty: target ? { lemma: lemmaOf(target), path: chain.map((c) => c.rel + (c.preps.length ? `[${c.preps.join(" ")}]` : "")).join(" < "), preps, dir: preps.find((x) => x === "from" || x === "to") ?? null } : null,
    };
  }
  return null;
}

/** judgeFrame(frame, kind, { vocab }) -> [{ level: 'error'|'flag', why }] — what the frame says about "this party is in a made, current relationship of this kind with the filer".
 *  kind 'licensor-out' expects the counterparty as recipient ("to"); 'licensor-in' and 'landlord' expect it as source ("from"). */
export function judgeFrame(frame, kind, { vocab = DEFAULT_VOCAB } = {}) {
  const out = [], CREATION = new Set(vocab.creation);
  if (!frame) return out;
  if (frame.negated) out.push({ level: "error", why: "the parse reads the clause as negated (the agreement was not entered)" });
  if (frame.modal.length) out.push({ level: "error", why: `the parse reads a modal "${frame.modal.join(" ")}" on a verb of making an agreement (${frame.verbs.filter((v) => CREATION.has(v)).join(", ")}): a possible future agreement, not a made one` });
  if (frame.ending) out.push({ level: "flag", why: `the clause is about the relationship ending ("${frame.root.lemma}")` });
  const dir = frame.counterparty?.dir ?? null;
  if (kind === "licensor-out" && dir === "from") out.push({ level: "error", why: 'the counterparty is the source ("from"), but the claim says the filer licenses out to it' });
  if ((kind === "licensor-in" || kind === "landlord") && dir === "to") out.push({ level: "error", why: `the counterparty is the recipient ("to"), but the claim says the filer receives ${kind === "landlord" ? "premises" : "rights"} from it` });
  return out;
}
