// prompt-policy.js — WHAT A PROMPT ASKS OF THE SYSTEM, AND WHAT THE SYSTEM CAN ACTUALLY DO ABOUT IT.
// The chat reads a prompt's behaviours (sentences about the protagonist: "Claude uses ...", "Claude should never ...") and counts them; nothing follows them. A man in a box who is
// handed a rulebook does one of three things with each rule: he does it, he checks he is not breaking it, or he notes that it is about a job he does not do. This organ sorts a
// prompt's behaviours that way, with the evidence for every sort, so that "as Claude" is auditable: how much of that prompt is something this system acts on, how much it can only be
// seen to obey, and how much is about work it does not do.
//
//   classify(behaviours, { embed }) -> { levers, checks, outside, summary }
//     behaviours  [{ text, modal, negative, conditional, span? }]   as the chat's readPersona lists them (kept as written)
//     lever       a declared capacity of this system, described in a sentence, and what a reply must look like to obey it (`check`) or what the system does when it is on (`acts`)
//
// WHAT "ABOUT" MEANS HERE, MEASURED. A behaviour belongs to a lever when a frozen embedder (a codec, never generation) puts the two sentences near each other: above the spread of
// ALL behaviour-lever pairs (mean + 2.5 sd, the repo's usual rule), and the lever is the behaviour's nearest. Polarity is the reader's mark on the behaviour (a negation or "never"), not
// a word list of this file. A behaviour with no lever above the null is OUTSIDE, and is listed in full: nothing is hidden because it does not fit.
// WHAT IT DOES NOT DO: act. `acts` says what the system would do; the chat (or the harness) carries it out and the audit cause-test proves it did. The levers are the system's own,
// declared here as data with the reason each is there; the catalogue is small on purpose.
// PURE except the injected embedder.
const hasListMarker = (t) => String(t).split("\n").some((l) => { const s = l.trimStart(); return s.startsWith("- ") || s.startsWith("* ") || s.startsWith("• ") || (s.length > 2 && s[0] >= "0" && s[0] <= "9" && (s[1] === "." || s[1] === ")")); });

/** The system's own capacities that a prompt's rule can be about. `check(reply)` is true when the reply obeys the rule with the polarity as written. */
export const LEVERS = Object.freeze([
  { id: "prose", says: "The assistant responds in plain prose rather than lists or bullet points.", why: "every reply is a sentence or two; the check proves it", kind: "checkable", check: (r) => !hasListMarker(r.text) },
  { id: "cite", says: "The assistant says where its answer came from and names the source.", why: "replies carry cites (a page and section, a giver, the prompt)", kind: "acts", acts: "show the reply's sources in the sentence", check: (r) => (r.cites ?? []).length > 0 },
  { id: "brief", says: "The assistant keeps responses short and to the point.", why: "an answer can be given alone or with the sentence it rests on", kind: "acts", acts: "give the answer alone, without the supporting sentence", check: (r) => r.text.length <= 140 },
  { id: "detailed", says: "The assistant explains at length and gives the supporting evidence.", why: "an answer can be given with the sentence it rests on", kind: "acts", acts: "add the supporting sentence to the answer", check: (r) => (r.evidence ?? []).length > 0 },
  { id: "plain-tone", says: "The assistant keeps a natural, conversational tone.", why: "the wording library can follow the look of the message (organs/expression-library.js)", kind: "acts", acts: "word social replies in the look of the person's message", check: null },
  { id: "no-apology", says: "The assistant does not apologise excessively or grovel.", why: "replies state gaps plainly; the check proves no apology word", kind: "checkable", check: (r) => !String(r.text).toLowerCase().includes("sorry") && !String(r.text).toLowerCase().includes("apolog") },
]);

const norm = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Float32Array.from(v, (x) => x / n); };
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

export async function classify(behaviours, { embed, levers = LEVERS, reference = null } = {}) {
  if (typeof embed !== "function") throw new TypeError("classify: an embedder must be supplied (a frozen codec)");
  const B = (behaviours ?? []).filter((b) => b?.text), vb = (await embed(B.map((b) => b.text))).map(norm), vl = (await embed(levers.map((l) => l.says))).map(norm);
  // THE NULL: how near a sentence about nothing in particular is to a lever. Measured on `reference` (sentences of an unrelated text), not on the prompt's own few rules: a prompt of four rules
  // would otherwise be its own null, and its best matches would be the thing that sets the bar they have to clear.
  const R = reference?.length ? (await embed(reference)).map(norm) : vb, all = []; for (let i = 0; i < R.length; i++) for (let j = 0; j < levers.length; j++) all.push(dot(R[i], vl[j]));
  // and how much nearer a sentence's best lever is than its second best, for sentences about nothing: a rule belongs to a lever only if it is near it AND clearly nearer it than to the rest
  const gaps = R.map((r) => { const ss = vl.map((l) => dot(r, l)).sort((x, y) => y - x); return (ss[0] ?? 0) - (ss[1] ?? 0); }), gm = gaps.length ? gaps.reduce((x, y) => x + y, 0) / gaps.length : 0, gsd = Math.sqrt(Math.max(0, gaps.length ? gaps.reduce((x, y) => x + y * y, 0) / gaps.length - gm * gm : 0)), marginTau = reference?.length ? gm + 2.5 * gsd : 0;   // without a reference there is no honest null for the margin: none is applied
  const m = all.length ? all.reduce((a, x) => a + x, 0) / all.length : 0, sd = Math.sqrt(Math.max(0, all.length ? all.reduce((a, x) => a + x * x, 0) / all.length - m * m : 0)), tau = m + 2.5 * sd;
  const out = { levers: [], checks: [], ambiguous: [], outside: [], threshold: +tau.toFixed(3), spread: { mean: +m.toFixed(3), sd: +sd.toFixed(3) }, margin: +marginTau.toFixed(3), nullFrom: reference?.length ? `${reference.length} sentences of an unrelated text` : "the prompt's own rules (weak: pass a reference)" };
  B.forEach((b, i) => {
    const ranked = levers.map((l, j) => ({ l, s: dot(vb[i], vl[j]) })).sort((a, c) => c.s - a.s), best = ranked[0], clear = !ranked[1] || best.s - ranked[1].s >= marginTau;
    const item = { behaviour: b.text, negative: !!b.negative, modal: b.modal ?? null, conditional: !!b.conditional, span: b.span ?? null };
    if (best && best.s >= tau && !clear) out.ambiguous.push({ ...item, candidates: ranked.slice(0, 2).map((x) => ({ lever: x.l.id, similarity: +x.s.toFixed(2) })) });   // near a lever, but about as near another: said so, not forced
    else if (best && best.s >= tau && clear) (best.l.kind === "acts" ? out.levers : out.checks).push({ ...item, lever: best.l.id, similarity: +best.s.toFixed(2), obey: best.l.kind === "acts" ? best.l.acts : "the reply must not break it", polarity: item.negative ? "not" : "do" });
    else out.outside.push({ ...item, nearest: best ? { lever: best.l.id, similarity: +best.s.toFixed(2), clear } : null });
  });
  out.summary = { behaviours: B.length, actsOn: out.levers.length, canCheck: out.checks.length, ambiguous: out.ambiguous.length, outside: out.outside.length };
  return out;
}

/** does a reply obey the checkable rules the prompt gave it? [{ lever, behaviour, ok }]: a rule with a negative mark is obeyed when the thing it forbids is absent */
export function conformance(classified, reply, levers = LEVERS) {
  const by = new Map(levers.map((l) => [l.id, l]));
  return [...classified.checks, ...classified.levers].filter((x) => by.get(x.lever)?.check).map((x) => { const ok = by.get(x.lever).check(reply); return { lever: x.lever, behaviour: x.behaviour, polarity: x.polarity, ok: x.polarity === "not" && x.lever !== "no-apology" && x.lever !== "prose" ? !ok : ok }; });
}
