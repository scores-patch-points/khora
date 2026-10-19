// opencode-shape.mjs — THE SHAPE CHECK. A hunt act declares its cell; the
// algebra checks it against the void's shape, and a hunt that used the wrong
// shape is a TYPED GAP, never a silent miss.
//
// The doctrine is native/the-fold/surf-types.js: "SURF IS THE GENERAL TERM, AND
// ITS SUBTYPES ARE THE CUBE'S CELLS … Each concrete act DECLARES the cell it
// occupies … so a surf act's domicile is checked against the algebra, and an
// act with no declared cell answers a typed gap, never a guessed home."
//
// foldcode's tool calls ARE the surf acts (its tools bring material to a
// reader): read → SEG·Ground, grep → SEG·Figure, glob → SIG·Figure, list →
// SIG·Ground, fetch/search → INS·Ground. The producing acts (write/edit/run)
// are NOT surf — they compose, they do not reach — and are named as such.
//
// FALSIFYING CONTROLS (opencode-shape.test.mjs):
//   - a read typed as anything but SEG·Ground breaks the declared domicile;
//   - a hunt act checked against a void shape it does not occupy that reports
//     ok breaks the shape check (it must be a wrong_shape gap);
//   - a producing act (write) reported as a surf act breaks the surf boundary.
import { surfTypeOf } from "./native/the-fold/surf-types.js";

// Tool name → surf act. The regex is the tool registry's own vocabulary (the
// same act classes fold.ts's actOf already uses), never a content read.
export function surfActOf(name) {
  const n = String(name ?? "").toLowerCase();
  if (!n) return null;
  // A WORD match, never a substring: "frobnicate" carries "cat" but is no act.
  // A known compound prefix ("webfetch", "websearch") is stripped first so its
  // bare act is found at the word boundary.
  const bare = n.replace(/^(web|native|fold)[_-]?/, "");
  const word = (re) => re.test(bare);
  if (word(/\b(grep|look)\b/)) return "grep";
  if (word(/\bglob\b/)) return "glob";
  if (word(/\blist\b/)) return "list";
  if (word(/\b(fetch|search|perceive)\b/)) return "fetch";
  if (word(/\b(read|view|cat|snip)\b/)) return "read";
  return null;
}

/** shapeOf(toolName) → the act's declared cell (via surfTypeOf) or null when
 *  the tool is not a surf act (a producing act — write/edit/run). */
export function shapeOf(name) {
  const act = surfActOf(name);
  if (!act) return null;
  const t = surfTypeOf(act);
  return t?.cell ? { act: t.act, cell: t.cell, verb: t.verb, what: t.what } : null;
}

/** checkShape({ tool, require }) → { ok, act, cell, verb } or a wrong_shape gap.
 *  `require` is the void's required shape — a cell ("SEG·Ground") or an operator
 *  ("SEG") — or null (no shape declared: the act's own cell is simply recorded). */
export function checkShape({ tool, require = null } = {}) {
  const s = shapeOf(tool);
  if (!s) return { ok: true, act: null, cell: null, note: "not a surf act — a producing act (write/edit/run) reaches nothing" };
  if (!require) return { ok: true, act: s.act, cell: s.cell, verb: s.verb, what: s.what };
  const req = String(require).trim();
  const op = s.cell.split("·")[0];
  const ok = s.cell === req || op === req;
  if (ok) return { ok: true, act: s.act, cell: s.cell, verb: s.verb };
  return {
    ok: false,
    act: s.act,
    cell: s.cell,
    verb: s.verb,
    gap: { type: "wrong_shape", detail: `the hunt act "${s.act}" occupies ${s.cell}; the void's shape is ${req}`, wanted: req },
  };
}
