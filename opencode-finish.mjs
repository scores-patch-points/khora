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

/** finish({ ask, draft, ground, notes, material }) -> {
 *    ok, output, superseded, lane, basis, observation, grounding, block,
 *    eot, ground_trace, tiers, disclosure }
 *  `output` is what should stand (the draw, or the settled computed value);
 *  `ground_trace` shows, per sentence, what it rests on. Pure of turn effects. */
export async function finish({ ask, draft, ground = null, notes = null, material = null, passages = null } = {}) {
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
    disclosure: settled
      ? "the machine settled this ask — the computed value stands, the model's draw is kept as superseded"
      : `the model's draw stands; its ground is shown — ${nGround} sentence(s) grounded, ${nSelf} the mouth's own`,
  };
}
