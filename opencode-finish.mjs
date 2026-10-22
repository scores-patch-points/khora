// opencode-finish.mjs — THE MECHANICAL STEP. The model's text is one step on
// the way to the output, never the output itself.
//
// The model's draw is converted to POS + EOT (the language-appropriate parse)
// and its propositions are typed against the ground — mechanically, NO model in
// the loop — by the holograph organs that already solve this:
//
//   native/organs/output-holograph.js::holographType
//     each generated sentence is MATERIAL iff it carries a ground fact's ends
//     through the SAME fold/morphology the record uses — so PARAPHRASE is
//     handled by the ends, never by string containment; else it is SELF:MODEL
//     (the mouth's own prose, named, never laundered). The fact's byte address
//     rides as its `ref`.
//   native/the-fold/proposition-holograph.js
//     the fuller atom capture (Reproduce/Derive/Invent typing, holonic cell
//     placement) — ABSTRACTION rides this tier; wired next, disclosed here.
//
// WHAT IT SHOWS, NEVER ENFORCES. The output is the model's text (it may be
// byte-identical); the step ADDS the ground — for every sentence, what it rests
// on (a byte address, or nothing). This is P186: disclosure, not censorship.
//
// It also keeps the Fold's precision race (native/organs/precision-race.js):
// when a mechanism SETTLES the ask, the computed value outweighs the draw and
// the draw is kept as `superseded` — a win keeps the loser.
//
// FALSIFYING CONTROLS (opencode-finish.test.mjs):
//   - a sentence that carries a ground fact's ends but is typed self:model (or
//     vice versa) breaks the paraphrase typing;
//   - an output that differs from the draw when nothing settled breaks
//     "show the ground, never rewrite";
//   - a settled ask whose draw is not kept in `superseded` breaks the race law;
//   - an empty ask that still returns an output breaks the empty guard.
import { runMechanical, precisionWinner } from "./native/organs/precision-race.js";
import { holographType, groundFacts } from "./native/organs/output-holograph.js";
import { splitSentences } from "./native/adapters/text/spans.js";
import { laneFor, laneBlock } from "./opencode-lane.mjs";
import { loadEotParser } from "./native/the-fold/eot-notation.js";
import { proseUnits, judgeAll, symbolUses, resolveSymbols, kindOf, restsOn } from "./opencode-profile.mjs";
import { janusPass } from "./opencode-janus.mjs";
import { isSummary, derive, leftOut } from "./opencode-summary.mjs";

let _mech = null;
async function mechanisms() {
  if (_mech) return _mech;
  try {
    const { buildMechanisms } = await import("./native/organs/mechanisms.js");
    _mech = buildMechanisms();
  } catch {
    _mech = [];
  }
  return _mech;
}

// POS + EOT: the draw is parsed by the same parser the rest of the Fold reads
// with (native/the-fold/eot-notation.js). One load, cached. A missing model is
// a typed gap, disclosed — never a silent pass.
let _parser = null;
async function parseEot(text) {
  try {
    if (!_parser) _parser = await loadEotParser();
    return _parser?.ok ? _parser.parse(String(text ?? "")) : null;
  } catch {
    return null;
  }
}

// The ground facts a claim is typed against. The CALLER may supply them (the
// door reads them off the record — admitted arrangements, each with its byte
// span); otherwise they are derived from the MATERIAL by the SAME composed
// reader the prose pipeline uses (gfp-relations-composed.js with the received
// priors, exactly as penelope's prose adapter supplies them) — positional
// arrangements, each carrying its byte offset. A fact with no address is a
// typed gap, never a guessed ref (output-holograph's own law).
let _priors = null;
async function readerPriors() {
  if (_priors) return _priors;
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const url = await import("node:url");
    const here = path.dirname(url.fileURLToPath(import.meta.url));
    const { getPosPrior } = await import("./native/the-fold/reader-bundle.js");
    const rc = path.join(here, "native", "priors", "role-config-eng.json");
    _priors = { posPrior: getPosPrior(), roleConfig: fs.existsSync(rc) ? JSON.parse(fs.readFileSync(rc, "utf8")) : null };
  } catch {
    _priors = { posPrior: null, roleConfig: null };
  }
  return _priors;
}

async function factsFromMaterial(material, source) {
  try {
    const { composedRelations } = await import("./native/adapters/text/gfp-relations-composed.js");
    const { classifyWord, dominantClass } = await import("./native/adapters/text/wordclass.js");
    const { posPrior, roleConfig } = await readerPriors();
    const read = composedRelations(String(material ?? ""), { posPrior, roleConfig, classifyWord, dominantClass });
    return (read.relations ?? [])
      .filter((r) => r && r.end1 && r.label)
      .map((r) => ({ end1: r.end1, label: r.label, end2: r.end2 ?? "", span: { start: Number(r.offset ?? 0) }, source }));
  } catch {
    return [];
  }
}

async function factsOf({ ground = null, notes = null, material = null, passages = [] } = {}) {
  if (Array.isArray(ground) && ground.length) return groundFacts(ground);
  if (Array.isArray(notes) && notes.length) return groundFacts(notes);
  // Each labelled passage is read on its own, so a fact's address is the passage's name and the offset inside it
  // ("mat.txt#42"), never an offset into the joined material.
  if (passages.length) return (await Promise.all(passages.map(async (p) => groundFacts(await factsFromMaterial(p.text, p.name))))).flat();
  if (material) return groundFacts(await factsFromMaterial(material, "material"));
  return [];
}

/** THE MECHANICALLY GROUNDED OUTPUT. Each sentence of the model's draw is typed
 *  against the material's HOLOGRAPH — its BEINGS (the referents it individuates)
 *  and its bound facts — never against a model:
 *    - the sentence's referents resolve to beings the material individuates
 *      (native/the-fold/referents.js::buildReferents → resolveText) — this is
 *      the identity that handles PARAPHRASE: "Curie" resolves to the being
 *      "Marie Curie", so a sentence naming the paraphrase is grounded on the
 *      same being; and
 *    - the sentence carries a ground fact's ends (output-holograph::holographType)
 *      — the byte address it rests on.
 *  A sentence with neither is SELF:MODEL — the mouth's own, named, never
 *  laundered. The output text is NOT rewritten; the ground is what is created.
 */
/** THE SOURCE PROPOSITIONS a grounded sentence rests on, LOCATED not generated: the passage sentences whose beings
 *  (the material's own referents) the draw sentence names. Each is the passage's VERBATIM slice with offsets
 *  (fold-chat-provenance.js `locate`'s rule: what is shown is the source's bytes, never a model's copy). */
/** The passage's own slice (verbatim) for a located sentence. */
const located = (passage, start, end) => ({ passage: passage.name, start, end, text: passage.text.slice(start, end) });

function sourcesFor(text, beings, R, passages, max = 2) {
  if (!R || !passages.length) return [];
  const want = R.resolveText(text);
  if (!want.size) return [];
  const found = [];
  passages.forEach((passage, pi) => {
    let at = 0;
    for (const raw of splitSentences(passage.text)) {
      const sent = String(typeof raw === "string" ? raw : raw?.text ?? "");
      const start = passage.text.indexOf(sent, at);
      if (!sent.trim() || start < 0) continue;
      at = start + sent.length;
      const have = R.resolveText(sent);
      const shared = [...want].filter((id) => have.has(id));
      if (shared.length) found.push({ ...located(passage, start, start + sent.length), index: pi, shared: shared.map((id) => R.represent(id)).filter(Boolean), n: shared.length });
    }
  });
  return found.sort((a, b) => b.n - a.n || a.index - b.index || a.start - b.start).slice(0, max).map(({ n, index, ...keep }) => keep);
}

async function groundDraw(draw, { material, facts, passages = [] }) {
  const sentences = splitSentences(String(draw))
    .map((s) => (typeof s === "string" ? s : s?.text ?? ""))
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
  const byFact = facts.length
    ? holographType({ prose: sentences.join("\n"), ground: facts, splitSentences, source: "material" }).prose
    : [];
  let R = null;
  if (material) {
    try {
      const { buildReferents } = await import("./native/the-fold/referents.js");
      R = buildReferents(String(material));
    } catch {
      R = null;
    }
  }
  return sentences.map((text, i) => {
    const t = byFact[i] ?? null;
    const ids = R ? [...R.resolveText(text)] : [];
    const beings = ids.map((id) => R.represent(id)).filter(Boolean);
    // A fact is carried only when the sentence carries ALL of its content ends (carry 1). A partial carry ("Marie"
    // of "Marie won Nobel") is a shared name, which the beings already disclose, never the fact's address.
    const onFact = t?.ground === "material" && t.carry >= 1;
    const grounded = onFact || beings.length > 0;
    return {
      text,
      standing: grounded ? "grounded" : "self:model",
      ...(onFact ? { ref: t.ref ?? null, fact: t.groundedOn ?? null } : {}),
      ...(beings.length ? { beings } : {}),
      ...(grounded ? (() => { const sources = sourcesFor(text, beings, R, passages); return sources.length ? { sources } : {}; })() : { source: "the mouth" }),
    };
  });
}

const SOURCE_CAP = 60_000;
/** The read sources some unit's evidence cites (by name or by url), each with its text capped. */
function citedSources(read, units) {
  const cited = units.flatMap((u) => [u.evidence, ...(u.from ?? [])]).filter(Boolean);
  const seen = new Set();
  return read
    .filter((p) => cited.some((e) => e.source === p.name || (p.url && e.url === p.url)))
    .filter((p) => !seen.has(p.name) && !!seen.add(p.name))
    .map((p) => ({ name: p.name, ...(p.url ? { url: p.url } : {}), text: p.text.length > SOURCE_CAP ? p.text.slice(0, SOURCE_CAP) : p.text }));
}

/** THE PROFILE of the output (opencode-profile.mjs): its kind, its checkable units (claims in prose, symbols in
 *  code), each judged against the turn's passages, and — when `research` is on — every claim or symbol the passages
 *  leave unsupported handed to the falsifier (opencode-research.mjs: the workspace, then Wikipedia), which re-judges
 *  it by the same rule and records where it looked. Argument is not checked; the words are never edited. */
async function profileDraw(draw, { passages = [], workspace = null, research = true, own = [], ask = "" } = {}) {
  const t0 = Date.now();
  let R = null;
  try {
    const { buildReferents } = await import("./native/the-fold/referents.js");
    // the beings the material AND the answer individuate: a subject the answer names is a subject even with no material
    R = buildReferents([...passages.map((p) => p.text), String(draw)].join("\n\n"));
  } catch { R = null; }
  const resolve = (s) => (R ? [...R.resolveText(s)].map((id) => R.represent(id)).filter(Boolean) : []);
  const summary = isSummary(ask, draw, passages);
  // In a SUMMARY every declarative sentence is a claim about the source — there is no "argument" to leave unchecked
  // ("the governor had already funded it" names no one and carries no number, and is exactly the invention to catch).
  const units = proseUnits(draw, { resolve, split: (t) => splitSentences(t) }).map((u) => (summary && u.standing === "argument" ? { ...u, standing: "unchecked" } : u));
  // every checkable sentence in ONE falsifier pass over the turn's passages (each passage an independent source)
  const todo = units.filter((u) => u.standing === "unchecked");
  const verdicts = judgeAll(todo.map((u) => u.text), passages, { own });
  let claims = units.map((u) => (u.standing === "unchecked" ? { ...u, ...verdicts[todo.indexOf(u)], searched: ["material"] } : u));
  // what the Fold's judge cannot read — order and counts — is arithmetic over the source's own numbers, decided by Janus
  claims = await janusPass(claims, passages);
  // A SUMMARY abstracts several source sentences and answers for what it leaves out (opencode-summary.mjs)
  if (summary) claims = derive(claims, passages);
  const parsed = symbolUses(draw);
  const fsx = await import("node:fs");
  const pathx = await import("node:path");
  const exists = (p) => { try { return !!workspace && fsx.existsSync(pathx.resolve(workspace, p)); } catch { return false; } };
  let symbols = resolveSymbols(parsed, passages, { exists });
  const log = [];
  let beings = [];
  let pages = [];
  if (research) {
    const { researchClaims, researchSymbols } = await import("./opencode-research.mjs");
    const rc = await researchClaims(claims, { workspace, text: passages.map((p) => p.text).join(" "), answer: draw, ask });
    claims = rc.claims; log.push(...rc.log); beings = rc.beings; pages = rc.pages ?? [];
    const rs = await researchSymbols(symbols, { workspace });
    symbols = rs.symbols; log.push(...rs.log);
    // an encyclopedia is an index: a support that rests on one is followed to the page it cites (opencode-primary.mjs followIndexes)
    const { followIndexes } = await import("./opencode-primary.mjs");
    // only the time this pass has left: the plugin stops waiting for it at 120 s (FOLD_RESEARCH_TIMEOUT_MS), and a pass that runs over loses its research too
    const followed = await followIndexes(claims, { deadline: Math.min(Date.now() + Number(process.env.FOLD_FOLLOW_MS ?? 45_000), t0 + Number(process.env.FOLD_PROFILE_BUDGET_MS ?? 110_000)) });
    claims = followed.claims; log.push(...followed.log); pages = [...pages, ...followed.pages];
  }
  const count = (xs, k) => xs.filter((x) => x.standing === k).length;
  return {
    v: 2,
    ...kindOf(draw, units),
    // nothing was read this turn: every claim rests on the model's own knowledge (the panel says so, instead of listing each)
    noMaterial: passages.length === 0,
    claims,
    symbols,
    counts: {
      supported: count(claims, "supported"), contradicted: count(claims, "contradicted"), unsupported: count(claims, "unsupported"),
      argument: count(claims, "argument") + count(claims, "question"),
      found: count(symbols, "found") + count(symbols, "own"), not_found: count(symbols, "not_found"), symbol_contradicted: count(symbols, "contradicted"), unchecked: count(symbols, "unchecked"),
    },
    rests: restsOn(claims, symbols),
    // the sources the evidence cites, whole, so the window can show each claim where it stands in its source
    sources: citedSources([...passages, ...pages], [...claims, ...symbols]),
    // THE SUMMARY's second reading: what it left out (beings the material individuates and figures it states, never carried)
    ...(summary ? { summary: { derived: claims.filter((c) => c.derived).length, added: claims.filter((c) => c.added).length, leftOut: leftOut(draw, passages, resolve) } } : {}),
    // which being each looked-up name was bound to (or why none was), with the candidates it was chosen from
    beings,
    research: { on: !!research, log, ms: Date.now() - t0, pending: research ? 0 : claims.filter((c) => c.standing === "unsupported").length + symbols.filter((x) => x.standing === "not_found" || x.standing === "unchecked").length },
  };
}

/** finish({ ask, draft, ground, notes, material }) -> {
 *    ok, output, superseded, lane, basis, observation, grounding, block,
 *    eot, ground_trace, tiers, disclosure }
 *  `output` is what should stand (the draw, or the settled computed value);
 *  `ground_trace` shows, per sentence, what it rests on. Pure of turn effects. */
export async function finish({ ask, draft, ground = null, notes = null, material = null, passages = null, workspace = null, own = [], research = process.env.FOLD_RESEARCH !== "0" } = {}) {
  const task = String(ask ?? "").trim();
  const draw = String(draft ?? "");
  if (!task) return { ok: false, gap: "empty-ask" };
  const lane = await laneFor({ ask: task, material });
  const observation = await runMechanical(task, await mechanisms());
  const race = precisionWinner({ observation, draft: draw });
  const settled = race.winner === "mechanical";
  // THE OUTPUT IS THE DRAW unless a mechanism outweighed it — the step shows the
  // ground, it does not rewrite the words.
  const output = settled ? race.text : draw;
  const records = await parseEot(output);
  const read = Array.isArray(passages) ? passages.filter((p) => p && typeof p.text === "string" && p.text) : [];
  const stuff = material || (read.length ? read.map((p) => p.text).join("\n\n") : null);
  const facts = await factsOf({ ground, notes, material: material || null, passages: material ? [] : read });
  // THE MECHANICALLY GROUNDED OUTPUT — created here, model-free.
  const grounded = await groundDraw(output, { material: stuff, facts, passages: read.length ? read : stuff ? [{ name: "material", text: String(stuff) }] : [] });
  const profile = await profileDraw(output, { passages: read.length ? read : stuff ? [{ name: "material", text: String(stuff) }] : [], workspace, research, own, ask });
  const nGround = grounded.filter((s) => s.standing === "grounded").length;
  const nSelf = grounded.length - nGround;
  return {
    ok: true,
    output,
    superseded: settled ? draw : null,
    lane: lane.lane,
    basis: race.basis,
    observation: lane.observation,
    grounding: lane.grounding,
    block: laneBlock(lane),
    // POS + EOT: how many records the parser read the output into.
    eot: records ? records.length : null,
    // THE GROUNDED OUTPUT: per sentence — grounded (with the beings it resolves
    // to and/or the byte ref it rests on) or self:model (the mouth's own).
    grounded,
    ground_trace: grounded,
    // THE PROFILE: what the window draws (the panel under the answer).
    profile,
    disclosure: settled
      ? "the machine settled this ask — the computed value stands, the model's draw is kept as superseded"
      : `the model's draw stands; its ground is shown — ${nGround} sentence(s) grounded, ${nSelf} the mouth's own`,
  };
}

/** The profile of an answer WITHOUT the settle step: grounding needs the material, not the ask. The window's message can reach the
 *  plugin with no readable ask text (the app builds its user message differently from the CLI), and an answer must not go unprofiled
 *  for that: the door profiles it, and says no ask was recorded. */
export async function profileOf({ draft, passages = null, material = null, workspace = null, own = [], research = process.env.FOLD_RESEARCH !== "0" } = {}) {
  const read = Array.isArray(passages) ? passages.filter((p) => p && typeof p.text === "string" && p.text) : [];
  const profile = await profileDraw(String(draft ?? ""), { passages: read.length ? read : material ? [{ name: "material", text: String(material) }] : [], workspace, research, own, ask: "" });
  return { ok: true, output: String(draft ?? ""), superseded: null, grounded: [], ground_trace: [], profile, lane: null, eot: null,
    disclosure: "no ask was recorded for this turn; the answer is profiled without the settling step" };
}

/** Pay the one-off cold cost (language-id models, the English parser, referent and relation priors, the Fold's judge, Janus) once,
 *  at boot, before the door listens. Measured 2026-10-19: the first finish() in a process takes ~36 s of synchronous work and every
 *  later one ~100 ms; paid on a live request it blocked the door's event loop for minutes and the stack's own watchdog read the door
 *  as down. A typed gap on any part is never a boot failure. */
export async function warmFinish() {
  const t0 = Date.now();
  try {
    await finish({
      ask: "summarize the minutes",
      draft: "The council voted 7 to 4 to approve the compromise. Marie Curie discovered radium in 1898, and she won two Nobel Prizes.\n\n```ts\nwithRetry(fn, { attempts: 3 })\n```",
      passages: [{ name: "warm.md", text: "The council voted 7 to 4 to approve the compromise after a long debate. Marie Curie discovered radium in 1898. Marie Curie won the Nobel Prize in Physics in 1903 and the Nobel Prize in Chemistry in 1911. export function withRetry(fn, opts: { attempts: number }) {}" }],
      research: false,
    });
  } catch { /* a typed gap */ }
  return { ok: true, ms: Date.now() - t0 };
}
