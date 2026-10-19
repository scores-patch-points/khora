// native/organs/mechanisms.js — the ONE mechanical pipeline list.
//
// The reason-gate's own doctrine (reason-gate.js) is explicit: the gate is
// given "the same precision-race mechanisms the doors already run … never a
// second list that drifts from the doors' own." Before this module proxy.mjs
// inlined the list; a second caller (the opencode door's lane pass) would have
// copied it, and the two would drift. Now there is one builder, and every
// caller — proxy.mjs's /v1/ask and /v1/chat/completions, the door's lane pass
// — runs the SAME three mechanisms.
//
// Each mechanism either settles the question, names a gap, or leaves it alone
// (returns null — not its question). Pure; the engine (`math`) is injected, so
// the caller owns the mathjs instance and this module carries no per-caller
// state. A caller that passes no engine gets a lazily-created default.
import { create, all } from "mathjs";
import { checkQuantity } from "../the-fold/arithmetic.js";
import { checkLogicPuzzle } from "../the-fold/logic-puzzle.js";
import { checkPreferencePuzzle } from "../the-fold/preference-puzzle.js";
import { CONCLUSION } from "./precision-race.js";

let _math = null;
const defaultMath = () => (_math ??= create(all));

/** buildMechanisms({ math }) -> the mechanism list runMechanical consumes.
 *  `math` defaults to a lazily-created mathjs instance. */
export function buildMechanisms({ math = null } = {}) {
  const engine = math ?? defaultMath();
  return [
    {
      name: "quantity",
      run(task) {
        const f = checkQuantity(task, { math: engine, now: new Date() });
        if (!f) return null;
        if (f.gap) return { concluded: false, gap: `${f.expression} — ${f.gap}` };
        return { concluded: true, kind: CONCLUSION.BOUND, text: f.display, detail: { kind: f.kind ?? "arithmetic", op: f.op ?? null, expression: f.expression } };
      },
    },
    {
      name: "logic-puzzle",
      run(task) {
        const f = checkLogicPuzzle(task);
        if (!f) return null;
        const kind = f.valid.length === 1 ? CONCLUSION.BOUND : f.valid.length === 0 ? CONCLUSION.CONTRADICTED : CONCLUSION.CONTESTED;
        return { concluded: true, kind, text: f.display, detail: { valid: f.valid, external: f.external, totalTried: f.totalTried } };
      },
    },
    {
      name: "preference-puzzle",
      run(task) {
        const f = checkPreferencePuzzle(task);
        if (!f) return null;
        const kind = f.valid.length === 1 ? CONCLUSION.BOUND : f.valid.length === 0 ? CONCLUSION.CONTRADICTED : CONCLUSION.CONTESTED;
        return { concluded: true, kind, text: f.display, detail: { valid: f.valid, external: f.external, totalTried: f.totalTried } };
      },
    },
  ];
}
