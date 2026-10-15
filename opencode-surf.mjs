// opencode-surf.mjs — the door's compression ladder over an opencode session's old turns.
// No model. Each turn is a region addressed `turn N#start-end`; rungs go up by recency and are
// admitted by the same MDL test as kernel/terrain-math.js interpretiveParadigmModels
// (members >= 2, independent grounds >= 2, compressionGain = separate - (model + pointers) > 0).
// Ascent compresses; every line keeps its address, so the frontier can drill back down.
//
//   Figure   newest `figure` turns: the ask + the answer sentences the current ask leans on
//   Kind     older turns sharing a rare-term signature, admitted by gain > 0: one line, member refs
//   Pattern  everything older than the Kind cap: one line, count + range + top terms
const WORD = /[\p{L}\p{N}_]{3,}/gu;
const terms = (t) => (String(t ?? "").toLowerCase().match(WORD) ?? []);
const sentences = (text) => {
  const out = [];
  const re = /[^.!?\n]+[.!?]?/g;
  let m;
  while ((m = re.exec(text))) { const s = m[0].trim(); if (s) out.push({ text: s, start: m.index, end: m.index + m[0].length }); }
  return out;
};
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function surf({ ask = "", turns = [], figure = 2, kindCap = 6, sentencesPer = 2 } = {}) {
  if (!turns.length) return { note: "", rungs: [], chars: 0 };
  // idf over the old turns; a term in at least half the units is the thread's idiom and weighs nothing
  const docs = turns.map((t) => new Set(terms(`${t.ask} ${t.answer}`)));
  const df = new Map();
  for (const d of docs) for (const w of d) df.set(w, (df.get(w) ?? 0) + 1);
  const idf = (w) => (turns.length > 1 && (df.get(w) ?? 0) * 2 >= turns.length ? 0 : Math.log(1 + turns.length / (df.get(w) ?? 1)));
  const askTerms = new Set(terms(ask));
  const sig = (i) => [...docs[i]].map((w) => [w, idf(w)]).filter(([w, s]) => s > 0 && (df.get(w) ?? 0) >= 2).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3).map(([w]) => w);

  const rungs = [];
  const n = turns.length;
  const figureFrom = Math.max(0, n - figure);
  for (let i = figureFrom; i < n; i++) {
    const t = turns[i];
    const ss = sentences(t.answer ?? "");
    const scored = ss.map((s, k) => ({ ...s, k, score: terms(s.text).reduce((a, w) => a + (askTerms.has(w) ? idf(w) || 0.1 : 0), 0) }));
    const picked = scored.slice().sort((a, b) => b.score - a.score || b.text.length - a.text.length || a.k - b.k).slice(0, sentencesPer).sort((a, b) => a.k - b.k);
    rungs.push({
      rung: "Figure", turn: t.n,
      line: `- turn ${t.n}: ${clip(t.ask ?? "", 200)}\n  ${picked.length ? picked.map((s) => clip(s.text, 220)).join(" ") : "(no text reply)"}`,
    });
  }

  // older turns: Kind by signature, then Pattern past the cap
  const older = Array.from({ length: figureFrom }, (_, i) => i);
  const groups = new Map();
  for (const i of older) { const k = sig(i)[0] ?? `~${i}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); }
  const kinds = [];
  const loose = [];
  for (const [key, idx] of groups) {
    const grounds = new Set(idx.flatMap((i) => turns[i].grounds ?? []));
    const complexity = 3;
    const gain = idx.length * complexity - (complexity + idx.length);
    if (idx.length >= 2 && grounds.size >= 2 && gain > 0) kinds.push({ key, idx, gain });
    else loose.push(...idx);
  }
  kinds.sort((a, b) => b.gain - a.gain);
  const kept = kinds.slice(0, kindCap);
  const overflow = [...kinds.slice(kindCap).flatMap((k) => k.idx), ...loose].sort((a, b) => a - b);
  for (const k of kept)
    rungs.unshift({ rung: "Kind", turn: null, line: `- kind [${sig(k.idx[0]).join(" ")}] gain ${k.gain}: turns ${k.idx.map((i) => turns[i].n).join(",")}` });
  if (overflow.length) {
    const top = new Map();
    for (const i of overflow) for (const w of sig(i)) top.set(w, (top.get(w) ?? 0) + 1);
    const words = [...top].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 5).map(([w]) => w);
    rungs.unshift({ rung: "Pattern", turn: null, line: `- pattern: ${overflow.length} turns (${turns[overflow[0]].n}–${turns[overflow.at(-1)].n}) about ${words.length ? `[${words.join(" ")}]` : `“${clip(turns[overflow[0]].ask ?? "", 60)}”…`}` });
  }
  const note = `[fold: ${n} earlier turn(s) held as a ladder; the full history stays in the session, drill down by address]\n${rungs.map((r) => r.line).join("\n")}`;
  return { note, rungs: rungs.map(({ rung, turn }) => ({ rung, turn })), chars: note.length };
}
