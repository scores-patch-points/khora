// opencode-lane.mjs — the reason-gate + the language leg on the door's context
// path. ADDITIVE: it changes no turn. It classifies the current ask before any
// model draw and hands the window a typed <fold-lane> block, so a frontier
// model knows (a) which lane II.9 puts it in, and (b) the grounding strength of
// the language it is reading.
//
// WHY. foldcode's fork never wired the reason-gate (no classifyTurn / lane /
// grounded anywhere in packages/core/src/plugin/fold.ts). A frontier model will
// reason to a fact unless the gate says otherwise. This is the smallest wiring
// that reaches the window WITHOUT rerouting model traffic: the door computes
// the lane on the existing `context` call, and the plugin injects the block.
//
// THE LANGUAGE LEG (khora native/the-fold/language-context.js) is the second
// half: it reads the language from the text's own words (script first, then the
// priors), reports whether the script is cased, and names the gap. The
// grounding disclosure is the MEASURED one — claim binding (R4) passes only for
// English today (khora polyglot session: 32 pass / 62 fail / 56 unmeasured of
// 150 language-rungs; R3, finding beings, fails in all 23 measurable
// languages). So `grounding: full` is claimed for eng only; every other
// language is `structural-only` — the window is told, never left to assume
// English-strength grounding.
//
// THE SHAPE is read structurally and omnilingually (native/organs/
// intent-reader.js: imperative = a verb root with no subject), never from a
// word list — the Fold's own law. A demand ("write me an essay") is typed as
// one, so the block can say: draw only the residue.
//
// FALSIFYING CONTROLS (opencode-lane.test.mjs):
//   - a `refuse`-lane ask whose block does not cite II.9 breaks the gate wiring;
//   - a mechanical ask (arithmetic) not settled at zero tokens breaks the
//     shared mechanism list (native/organs/mechanisms.js);
//   - a non-English ask whose block reports `grounding: full` breaks the
//     language leg's disclosure;
//   - a block returned for an empty ask breaks the empty guard;
//   - a budget-exceeded call that throws instead of returning a typed gap
//     breaks the door's fail-open contract.
import { classifyTurn } from "./native/organs/reason-gate.js";
import { languageContextFor } from "./native/the-fold/language-context.js";
import { readIntent } from "./native/organs/intent-reader.js";
import { loadEotParser } from "./native/the-fold/eot-notation.js";

export const LANE_ON = () => process.env.FOLD_LANE !== "0";
export const laneBudgetMs = () => Number(process.env.FOLD_LANE_MS ?? 800);

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

/** The grounding strength of a language, by the measured wall (never a guess):
 *  claim binding (R4) passes only for English today, so only eng is `full`;
 *  every other language is `structural-only`; an unread language is `unknown`. */
export function groundingFor(language) {
  if (!language) return "unknown";
  return language === "eng" ? "full" : "structural-only";
}

// ONE parser load, ONE parse. The parser model (parser-eng-ewt.json) is a 16 MB
// one-time load; the gate and the shape reader share it (the gate skips its own
// load when handed `records`), so the door pays the stall once, not twice.
let _parser = null;
async function parseOnce(task) {
  try {
    if (!_parser) _parser = await loadEotParser();
    return _parser?.ok ? _parser.parse(task) : null;
  } catch {
    return null;
  }
}

/** warm() -> load the parser + mechanisms OFF the request path so the first
 *  context turn finds them cached. Fire-and-forget at door boot; returns the
 *  measured ms. Never throws. */
export async function warm() {
  const t0 = Date.now();
  try {
    await mechanisms();
    await parseOnce("");
  } catch {
    /* a missing parser is a typed gap, never a boot failure */
  }
  return { ok: true, ms: Date.now() - t0 };
}

/** laneFor({ ask, material, history, surfaced, swarm, derive, mechanisms })
 *  -> { ok, lane, reason, intents, demand, language, casedScript,
 *       casedFraction, langGap, grounding, observation }
 *  Pure of turn effects; the only IO is loading the parser + priors (cached). */
export async function laneFor({ ask, material = null, history = [], surfaced = null, mechanisms: injected = null, swarm = null, derive = null } = {}) {
  const task = String(ask ?? "").trim();
  if (!task) return { ok: false, gap: "empty-ask" };
  const lang = languageContextFor(material || task, {});
  const mech = injected ?? (await mechanisms());
  const records = await parseOnce(task);
  const gate = await classifyTurn({ task, mechanisms: mech, history, surfaced, swarm, derive, records });
  const intents = records ? readIntent(records).intents : [];
  return {
    ok: true,
    lane: gate.lane,
    reason: gate.reason ?? null,
    intents,
    demand: intents.includes("imperative"),
    language: lang.language ?? null,
    casedScript: lang.casedScript ?? null,
    casedFraction: lang.casedFraction ?? null,
    langGap: lang.gap ?? null,
    grounding: groundingFor(lang.language),
    observation: gate.observation
      ? { mechanism: gate.observation.mechanism ?? null, kind: gate.observation.kind ?? null, text: gate.observation.text ?? null }
      : null,
  };
}

const LANE_LINE = Object.freeze({
  mechanical: "the organs settled this — computed, not generated (zero model tokens)",
  context: "the record holds this — phrase it, never reason past it",
  swarm: "hard meaning — read the swarm's answer, no model",
  grounded: "narrate the surfaced spans only; never assert past them",
  reasoning: "write notes (premises); the kernel derives — never your own conclusion",
  register: "nothing the machine settles, holds, or surfaces — phrase it; never reason to a fact (II.9)",
  refuse: "the machine cannot settle this without you reasoning — refuse, citing II.9",
});

const casedAttr = (c) => (c === true ? "yes" : c === false ? "no" : "unknown");
const casedWord = (c) => (c === true ? "cased" : c === false ? "caseless" : "unknown");

/** The <fold-lane> block the window reads. Delimited and typed like every other
 *  fold block; the legend explains it. Mechanical only — the door authored it,
 *  never the user. */
export function laneBlock(info) {
  if (!info?.ok) return null;
  const header =
    `lane="${info.lane}" lang="${info.language ?? "unknown"}" cased="${casedAttr(info.casedScript)}" ` +
    `grounding="${info.grounding}" shape="${(info.intents ?? []).join("+") || "unread"}" ` +
    `from="the current ask" made="reason-gate + language leg"`;
  const body = [`lane: ${info.lane} — ${LANE_LINE[info.lane] ?? info.reason ?? ""}`];
  if (info.observation?.text) body.push(`settled: ${info.observation.text}`);
  body.push(
    `language: ${info.language ?? "unknown"} (${casedWord(info.casedScript)} script). grounding: ${info.grounding}` +
      (info.grounding === "full"
        ? " — every claim must bind to a byte-addressed span"
        : " — claim binding passes only for English today; do not present a claim as bound unless a span carries it"),
  );
  if (info.demand) body.push("shape: a demand (imperative) — draw only the residue; a proposition with no span is [voice] or a holding, never a world fact");
  return `<fold-lane ${header}>\n${body.join("\n")}\n</fold-lane>\n\n`;
}

/** lanePass({ ask, budgetMs, ...opts }) -> { ...info, block }
 *  Bounded: a slow parser/priors load yields a typed gap, never a stalled
 *  door (the door's own fail-open contract). */
export async function lanePass({ ask, budgetMs = laneBudgetMs(), ...opts } = {}) {
  if (budgetMs <= 0) return { ok: false, gap: "lane-budget", block: null };
  const info = await Promise.race([
    laneFor({ ask, ...opts }).catch(() => ({ ok: false, gap: "lane-error" })),
    new Promise((resolve) => setTimeout(() => resolve({ ok: false, gap: "lane-budget" }), budgetMs)),
  ]);
  return { ...info, block: laneBlock(info) };
}
