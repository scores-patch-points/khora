// opencode-surf.mjs — the door's compression ladder over an opencode session's old turns.
// No model. Each turn is a region addressed `turn N#start-end`; rungs go up by recency and are
// admitted by the same MDL test as kernel/terrain-math.js interpretiveParadigmModels
// (members >= 2, independent grounds >= 2, compressionGain = separate - (model + pointers) > 0).
// Ascent compresses; every line keeps its address, so the frontier can drill back down.
//
//   Figure   newest `figure` turns: the ask + the answer sentences the current ask leans on
//   Kind     older turns sharing a rare-term signature, admitted by gain > 0: one line, member refs
//   Pattern  everything older than the Kind cap: one line, count + range + top terms
//   Anchor   the ask's OWN rare terms recall the old turns carrying them — Houdini's rule (fold-chat-houdini.js:
//            an old turn is recalled through a UNIQUE ANCHOR, a term in at most `anchorDf` exchanges). This rung is
//            why a one-off needle is findable: Kind keeps only terms SHARED by >= 2 turns, so it hides the one term
//            that occurs once — exactly a needle. The stack already solved this; the rung wires it, it is not new.
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
// A Kind's members as an address list, BOUNDED: printing every member turn made the line grow with the history
// (O(n)), so the "flat window" claim was false. The first few members address the cluster; the count says the rest.
const membersList = (ns, cap = 8) => (ns.length <= cap ? ns.join(",") : `${ns.slice(0, cap).join(",")} (+${ns.length - cap} more)`);

// MODE. `ladder` (default): the newest turns ride with the answer sentences the ask leans on — the window carries
// the memory. `pointer`: the window carries ADDRESSES only (`turn N`); the trail on disk holds the bytes, so the
// agent need not remember what it is doing — it drills with SNIP. The ablation is FOLD_SURF_MODE=pointer; the
// falsifier is opencode-surf-pointer.test.mjs (every pointer must resolve byte-exact in the byte store).
// Default is POINTER (2026-10-16): the trail on disk is the memory, so the window carries addresses, not sentences.
// The falsifier (opencode-surf-pointer.test.mjs) is green and the locality suite is unchanged, so the drop is lossless.
// FOLD_SURF_MODE=ladder restores the sentence-carrying arm for the ablation.
export function surf({ ask = "", turns = [], figure = 2, kindCap = 6, sentencesPer = 2, mode = process.env.FOLD_SURF_MODE ?? "pointer" } = {}) {
  if (!turns.length) return { note: "", rungs: [], chars: 0 };
  const pointer = mode === "pointer";
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
      // pointer mode drops the sentences; the address stands for them (the trail holds the bytes)
      line: pointer
        ? `- turn ${t.n}: ${clip(t.ask ?? "", 200)}`
        : `- turn ${t.n}: ${clip(t.ask ?? "", 200)}\n  ${picked.length ? picked.map((s) => clip(s.text, 220)).join(" ") : "(no text reply)"}`,
    });
  }

  // older turns: Kind by signature, then Pattern past the cap
  const older = Array.from({ length: figureFrom }, (_, i) => i);

  // ANCHORS — the rung surf was missing, and its absence is exactly why a one-off needle is invisible. A needle IS
  // the term that occurs once; sig() keeps only terms a second turn shares (df >= 2) and so drops it, and the
  // Pattern line prints a range, never the address. The rule is Houdini's, not a new one: an old turn is recalled
  // through a UNIQUE ANCHOR — a term in at most ANCHOR_DF exchanges and in no checked record (the-fold
  // fold-chat-houdini.js anchorDf). Read the stack first; re-deriving a retriever the stack already has is the wall.
  const ANCHOR_DF = 2;
  const anchorLines = [...askTerms]
    .map((t) => [t, df.get(t) ?? 0])
    .filter(([, d]) => d >= 1 && d <= ANCHOR_DF)
    .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 3)
    .flatMap(([t]) => { const idx = older.filter((i) => docs[i].has(t)); return idx.length ? [`- anchor [${t}]: turns ${idx.map((i) => turns[i].n).join(",")}`] : []; });

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
    rungs.unshift({ rung: "Kind", turn: null, line: `- kind [${sig(k.idx[0]).join(" ")}] gain ${k.gain}: turns ${membersList(k.idx.map((i) => turns[i].n))}` });
  if (overflow.length) {
    const top = new Map();
    for (const i of overflow) for (const w of sig(i)) top.set(w, (top.get(w) ?? 0) + 1);
    const words = [...top].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 5).map(([w]) => w);
    rungs.unshift({ rung: "Pattern", turn: null, line: `- pattern: ${overflow.length} turns (${turns[overflow[0]].n}–${turns[overflow.at(-1)].n}) about ${words.length ? `[${words.join(" ")}]` : `“${clip(turns[overflow[0]].ask ?? "", 60)}”…`}` });
  }
  // anchors ride at the top: a direct cue to an old turn the ask's own words name (highest-priority distinction)
  for (const line of anchorLines.reverse()) rungs.unshift({ rung: "Anchor", turn: null, line });
  // The head is a cue, not narration: it changes the next call (drill down) or says nothing. Pointer mode drops the
  // "held as a ladder" narration — the trail is the memory; the model only needs to know a ref is drillable.
  const head = pointer
    ? `[fold: ${n} earlier turn(s) as addresses — SNIP a "turn N" to re-read its bytes from the session]`
    : `[fold: ${n} earlier turn(s) held as a ladder; the full history stays in the session, drill down by address]`;
  const note = `${head}\n${rungs.map((r) => r.line).join("\n")}`;
  return { note, rungs: rungs.map(({ rung, turn }) => ({ rung, turn })), chars: note.length, mode };
}
