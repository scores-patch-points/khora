// opencode-sealed.mjs — the SEALED call. A frontier model is handed one minimal prompt: the last few turns verbatim and
// the bytes of only those old referents a cheap selector chose. The selector sees NAMES, never contents:
//   referent  = one old tool result or one old agent answer, with an opaque per-prompt handle and a mechanical name
//   name      = what the referent is called (tool + path + the identifiers it declares / the first content words)
//   selector  = (probe, referents) -> indices. Mechanical (term overlap, no model) or a small local model shown only
//               the question and the names. It never writes the answer and never sees bytes.
//   sealed    = the frontier gets recent turns + the chosen bytes, and nothing else; if the selector picks nothing the
//               call UNSEALS: the same prompt plus a names list the model can ask `SNIP <handle>` against.
// Toggle: FOLD_SEALED=1 turns it on; anything else is off and callers keep the unsealed path. Pure: no fetch, no fs.
export const sealedEnabled = (env = process.env) => env.FOLD_SEALED === "1"

const STOP = new Set(("the a an and or of to in on at for with from by is are was were be been it its this that these those how what which who when where why did do does done "
  + "you your we our i me my they them their there here have has had will would can could should may might about into over under then than also just only "
  + "many much long one two all any some each every more most other such same value values set configured configure code read earlier tell remind settle settled setting total add together").split(/\s+/))
const words = (s) => String(s ?? "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().match(/[a-z]{3,}/g) ?? []
const stem = (w) => w.slice(0, 4)
export const termsOf = (s) => [...new Set(words(s).filter((w) => !STOP.has(w)).map(stem))]

/** Identifiers a file declares (ALL_CAPS constants, `export const` names): its beings, in order, at most `max`. */
export const beingsOf = (text, max = 12) => {
  const out = []
  for (const m of String(text ?? "").matchAll(/\bexport\s+(?:const|let|function)\s+([A-Za-z_][A-Za-z0-9_]*)|\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)) {
    const id = m[1] ?? m[2]
    if (!out.includes(id)) out.push(id)
    if (out.length >= max) break
  }
  return out
}

/** The referents of a session's OLD turns (everything before the last `keep`), each with a mechanical name. */
export function referentsOf(turns, { keep = 6 } = {}) {
  const cut = Math.max(0, turns.length - keep)
  const refs = []
  turns.slice(0, cut).forEach((t, i) => {
    ;(t.calls ?? []).forEach((c, j) => {
      const beings = beingsOf(c.output)
      refs.push({ id: `t${i + 1}.c${j}`, turn: i, part: "call", name: `${c.tool} ${c.path}${beings.length ? " · " + beings.join(" ") : ""}`, bytes: c.output, tool: c.tool, path: c.path })
    })
    const lead = words(t.answer).filter((w) => !STOP.has(w)).slice(0, 10).join(" ")
    if (t.answer) refs.push({ id: `t${i + 1}.a`, turn: i, part: "answer", name: `answer · ${lead}`, bytes: t.answer })
  })
  return { refs, cut }
}

/** Mechanical selector: names scored by the probe's rare terms (idf over the names, as surf does), top `top` with score > 0. */
export function mechanicalSelect(probe, refs, { top = 3 } = {}) {
  const q = new Set(termsOf(probe))
  const docs = refs.map((r) => new Set(termsOf(r.name)))
  const df = new Map()
  for (const d of docs) for (const w of d) df.set(w, (df.get(w) ?? 0) + 1)
  const idf = (w) => ((df.get(w) ?? 0) * 2 >= refs.length ? 0 : Math.log(1 + refs.length / (df.get(w) ?? 1)))
  return docs
    .map((d, i) => ({ i, s: [...q].reduce((a, w) => a + (d.has(w) ? idf(w) : 0), 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, top)
    .map((x) => x.i)
}

/** The tiny prompt a local model sees: the question and numbered names. Facts only; the answer format is stated, not demanded. */
export const selectPrompt = (probe, refs, { top = 3, maxNames = 60 } = {}) => {
  const list = refs.slice(-maxNames).map((r, i) => `${refs.length > maxNames ? refs.length - maxNames + i + 1 : i + 1}. ${r.name.slice(0, 110)}`).join("\n")
  return `An earlier session left these referents, each listed by name:\n${list}\n\nThe question is: ${probe}\nThe referents that hold what the question needs are listed here by number (at most ${top}, comma separated, or NONE): `
}
export const parseSelection = (text, n, { top = 3 } = {}) => {
  if (/\bnone\b/i.test(String(text).slice(0, 40)) && !/\d/.test(String(text).slice(0, 40))) return []
  const nums = (String(text).match(/\d+/g) ?? []).map(Number).filter((k) => k >= 1 && k <= n).map((k) => k - 1)
  return [...new Set(nums)].slice(0, top)
}

/**
 * Seal one call. `select(probe, refs) -> indices` may be async. Returns the prompt context, the chosen ids, and
 * whether it had to unseal. `render(turns, from)` draws the recent turns verbatim (injected, so the caller's format stands).
 */
export async function seal({ turns, probe, render, select, keep = 6, top = 3 }) {
  const { refs, cut } = referentsOf(turns, { keep })
  const recent = render(turns.slice(cut), cut)
  let picked = []
  try { picked = ((await select(probe, refs)) ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < refs.length).slice(0, top) } catch { picked = [] }
  if (picked.length) {
    const kept = picked.map((i) => refs[i])
    const authored = kept.map((r) => `kept: ${r.name}`).join("\n")
    const context = `${kept.map((r) => `[kept: ${r.name}]\n${r.bytes}`).join("\n\n")}\n\n${recent}`
    return { context, authored, selected: kept.map((r) => r.id), refs, unsealed: false, resolve: undefined, index: undefined }
  }
  // unsealed: the model gets the names with opaque handles it may ask for, which is the handles arm's shape
  const store = new Map(), index = new Map(), used = new Set()
  const mint = () => { for (;;) { const h = `r${100 + Math.floor(Math.random() * 900)}`; if (!used.has(h)) return (used.add(h), h) } }
  const lines = refs.map((r) => { const h = mint(); store.set(h, r.bytes); index.set(h, { turn: r.turn + 1, planted: r.part === "call" ? undefined : undefined, ref: r }); return `${h}  ${r.name}` })
  return { context: `[earlier referents; SNIP <handle> returns the bytes]\n${lines.join("\n")}\n\n${recent}`, authored: lines.join("\n"), selected: [], refs, unsealed: true, resolve: (h) => store.get(h), index }
}
