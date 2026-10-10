// scripts/lib/frame-build.mjs — the arithmetic of build-frame-prior.mjs, importable.
// build-frame-prior.mjs (the CLI) and build-refusal-floor.mjs (which builds a frame prior
// from each K-fold of a treebank) both call buildFrameData, so the prior the reader loads
// and the prior the refusal floor is calibrated against are built by ONE function.

export const MIN_FRAME = 5; // a frame cell is kept at >= this many hapax observations; below it the backoff speaks

/** parseTreebank(text) → sentences: [[{form (lowercase), upos, lemma, xpos}]] — syntactic words only. */
export function parseTreebank(text) {
  const sentences = [];
  let toks = [];
  for (const line of String(text).split("\n")) {
    if (line.startsWith("#")) continue;
    if (!line.trim()) { if (toks.length) sentences.push(toks); toks = []; continue; }
    const c = line.split("\t");
    if (!/^[0-9]+$/.test(c[0])) continue;
    toks.push({ form: c[1].toLowerCase(), upos: c[3], lemma: c[2], xpos: c[4] });
  }
  if (toks.length) sentences.push(toks);
  return sentences;
}

const total = (m) => Object.values(m).reduce((a, b) => a + b, 0);
const majority = (m) => Object.entries(m).sort((a, b) => b[1] - a[1])[0][0];

/** The form -> {upos: n} tally (POSPrior@1's `forms`) of parsed sentences. */
export function tallyForms(sentences) {
  const tally = new Map();
  for (const s of sentences) for (const t of s) { const m = tally.get(t.form) ?? {}; m[t.upos] = (m[t.upos] ?? 0) + 1; tally.set(t.form, m); }
  return tally;
}

/** buildFrameData(sentences, {minFrame, tally}) → { marginal, frames (kept), dropped, hapax } — exactly what build-frame-prior.mjs writes. */
export function buildFrameData(sentences, { minFrame = MIN_FRAME, tally = tallyForms(sentences) } = {}) {
  const classOf = (form) => { const m = tally.get(form); return !m || total(m) < 2 ? "UNK" : majority(m); };
  const frames = {};
  const bump = (key, upos) => { (frames[key] ??= {})[upos] = (frames[key][upos] ?? 0) + 1; };
  const marginal = {};
  for (const s of sentences) {
    for (let i = 0; i < s.length; i++) {
      const t = s[i];
      if (total(tally.get(t.form)) !== 1) continue; // hapax only
      const P = i === 0 ? "^" : classOf(s[i - 1].form);
      const N = i === s.length - 1 ? "$" : classOf(s[i + 1].form);
      bump(`${P}|${N}`, t.upos); bump(`${P}|*`, t.upos); bump(`*|${N}`, t.upos); bump("*|*", t.upos);
      marginal[t.upos] = (marginal[t.upos] ?? 0) + 1;
    }
  }
  const kept = {};
  let dropped = 0;
  for (const [k, v] of Object.entries(frames)) { if (total(v) >= minFrame || k === "*|*") kept[k] = v; else dropped += 1; }
  return { marginal, frames: kept, dropped, hapax: Object.values(marginal).reduce((a, b) => a + b, 0) };
}
