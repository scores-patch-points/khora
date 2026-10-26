// atom-forms.js — a reading's atoms in their CANONICAL FORMS, written by the reader (the stage spec, RC6). Two rewrites, moved here unchanged from
// atom-support.js (MEANING-ATOMS §5.1), so that a check reads the claim as the reader wrote it instead of rewriting it at match time:
// - "no X is higher than Y" is "Y is the highest": a negated comparison from a "no" quantifier becomes the superlative of its second
//   referent, and the other negated atoms on the "no X" referent are said of that referent, asserted ("NOT in(no mountain, Washington)" →
//   in(Rainier, Washington)); the superlative keeps the comparative's word (`head`), so its Degree feature can be read;
// - "X is another name for Y" is named(Y, X).
// DEBT, stated: the "no" quantifier and the naming nouns are matched by two hand-written word lists (NO, NAME), carried here as they were. The
// language's own features could replace them (UD PronType=Neg on the determiner); that is not done here, so the rewrites read exactly as before.
//   canonicalForms(atoms) → atoms (the rewritten ones carry `rewritten`; atoms a rewrite consumed are absent)
const low = (s) => String(s ?? "").normalize("NFKC").toLowerCase();
const ART = /^(the|a|an|el|la|los|las|lo|un|una|le|les|l'|l’|un|une|des|du|de la|der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+/u;
const NO = /^(no|none|neither|kein|keine|keiner|keinen|aucun|aucune|nul|nulle|ningún|ninguna|ninguno|nadie)\s/i;
const NAME = /^(name|nom|nombre|name|bezeichnung|名前|別名|名称)$/i;
export function canonicalForms(C) {
  let out = [...C];
  const noArg = (a) => a && typeof a === "object" && NO.test(String(a.name ?? a.value ?? ""));
  const cmp = out.find((c) => c.neg && (c.args ?? []).length === 2 && noArg(c.args[0]) && !noArg(c.args[1]));
  if (cmp) {
    const Y = cmp.args[1], X = cmp.args[0], w = low(cmp.pred).replace(/^(more|most):/, "").split(/[_\s]+/)[0];
    const key = (a) => a.entity ?? low(a.value ?? a.name);
    out = out.filter((c) => !(c.pred === cmp.pred || (c.args ?? []).length === 2 && key(c.args[0]) === key(X) && key(c.args[1]) === key(Y)))
      .map((c) => (c.neg && noArg(c.args?.[0]) && key(c.args[0]) === key(X) ? { ...c, neg: false, args: [Y, ...c.args.slice(1)], rewritten: "no-comparative" } : c));
    out.push({ pred: `most:${w}`, args: [Y], neg: false, hedged: !!cmp.hedged, rewritten: "no-comparative", text: `most:${w}(${Y.name ?? Y.value})`, head: cmp.head ?? null, start: cmp.start ?? null, end: cmp.end ?? null });
  }
  for (const n of out.filter((c) => c.pred === "is_a" && NAME.test(low(c.args?.[1]?.value ?? c.args?.[1]?.name ?? "").replace(ART, "").split(/\s+/).at(-1) ?? ""))) {
    const X = n.args[0], f = out.find((c) => c !== n && (c.args ?? []).length === 2 && /(_|^)(for|de|für|pour|del|の)$/.test(c.pred) && (c.args[0].entity ?? c.args[0].value) === (X.entity ?? X.value));
    if (!f) continue;
    out = out.filter((c) => c !== n && c !== f);
    out.push({ pred: "named", args: [f.args[1], X], neg: !!n.neg, hedged: !!n.hedged, rewritten: "another-name", text: `named(${f.args[1].name ?? f.args[1].value}, ${X.name ?? X.value})`, head: n.head ?? null, start: n.start ?? null, end: n.end ?? null });
  }
  return out;
}
