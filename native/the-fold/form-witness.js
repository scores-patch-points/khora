// form-witness.js — IS THIS THE RIGHT SHAPE, before any test is spent.
//
// The user's law (2026-10-15): priors and specimens improve RECALL and let us know whether a
// thing is well formed for an arbitrary task — without being admitted as content. A form
// witness reads the SHAPE the task's own evidence implies (here: how the deciding test calls
// the unit and what it compares the result to) and compares a draw's shape to it. It never
// supplies a word of the answer, never rewrites the draw, and never says the draw is CORRECT:
// well-formed is coherence, verified is correspondence (THE-CORE-MECHANISM, the wall). Only the
// real test verifies.
//
// REFUSE vs FLAG: a draw is refuted only when its shape is KNOWN and disjoint from the
// expected shape (a body that can only return None where the test compares to True). A shape
// the witness cannot read is `unlicensed` — a flag, never a refusal — so a correct draw in an
// unusual shape is not punished. bool is read as a number where the test compares to a number
// (True == 1), for the same reason.
//
// PURE. No I/O, no model, no mutation.

export const FORM_WITNESS_SCHEMA = "FormWitness@1";

const escapeRe = (s) => String(s ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NUM = String.raw`-?\d+(?:\.\d+)?`;

/** The text of a call's argument list starting at `open` (index of "("), or null if unbalanced. */
function argsAt(line, open) {
  let depth = 0;
  for (let i = open; i < line.length; i += 1) {
    const c = line[i];
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") { depth -= 1; if (depth === 0) return { args: line.slice(open + 1, i), end: i + 1 }; }
  }
  return null;
}
const arityOf = (args) => {
  const t = args.trim();
  if (!t) return 0;
  let depth = 0, n = 1;
  for (const c of t) {
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") depth -= 1;
    else if (c === "," && depth === 0) n += 1;
  }
  return n;
};

/** What a literal says about the kind of the value it is compared to. */
function kindOfLiteral(lit) {
  const t = String(lit ?? "").trim();
  if (/^(True|true|False|false)$/.test(t)) return "bool";
  if (/^(None|null|undefined)$/.test(t)) return "none";
  if (new RegExp(`^${NUM}$`).test(t)) return "number";
  if (/^(["'`]).*\1$/.test(t)) return "str";
  if (t.startsWith("[")) return "list";
  if (t.startsWith("{")) return "dict";
  if (t.startsWith("(")) return "tuple";
  return null;
}

/**
 * formInvariants({ unit, texts }) → { unit, calls, arities, expect:[kinds], nonNull, evidence:[...] }
 * `texts` are the task's deciding material (test files, as strings). Every line that calls the
 * unit and compares the result is read; nothing else is.
 */
export function formInvariants({ unit, texts = [] } = {}) {
  const name = String(unit ?? "");
  const out = { schema: FORM_WITNESS_SCHEMA, unit: name, calls: 0, arities: [], expect: [], nonNull: false, evidence: [] };
  if (!name) return out;
  const callRe = new RegExp(`(?<![\\w.])${escapeRe(name)}\\s*\\(`, "g");
  const kinds = new Set(), arities = new Set();
  for (const text of [].concat(texts)) {
    for (const line of String(text ?? "").split("\n")) {
      if (/^\s*(?:def|function|async function|class)\b/.test(line)) continue; // a declaration is not a use
      let m;
      callRe.lastIndex = 0;
      while ((m = callRe.exec(line))) {
        const open = m.index + m[0].length - 1;
        const got = argsAt(line, open);
        if (!got) continue;
        out.calls += 1;
        arities.add(arityOf(got.args));
        const rest = line.slice(got.end);
        let k = null;
        let r;
        // `f(...) is True` / `is not True` / `== 3` / `!= "x"` / `is None` / `is not None`
        if ((r = /^\s*(?:is\s+not|is|==|!=|===|!==)\s*(None|null|undefined)\b/.exec(rest))) {
          if (/\bnot\b|!=|!==/.test(rest.slice(0, r[0].length))) out.nonNull = true; else kinds.add("none");
          out.evidence.push(line.trim().slice(0, 140));
          continue;
        }
        if ((r = /^\s*(?:is\s+not|is|==|!=|===|!==)\s*(True|False|true|false)\b/.exec(rest))) k = "bool";
        else if ((r = new RegExp(`^\\s*(?:==|!=|===|!==|<=|>=|<|>)\\s*(${NUM})\\b`).exec(rest))) k = "number";
        else if ((r = /^\s*(?:==|!=|===|!==)\s*(["'`][^"'`]*["'`])/.exec(rest))) k = "str";
        else if ((r = /^\s*(?:==|!=|===|!==)\s*([\[{(])/.exec(rest))) k = kindOfLiteral(r[1]);
        // assertEqual(f(..), X) / expect(f(..)).toBe(X) / toEqual(X)
        else if ((r = /^\s*\)?\s*,\s*(True|False|None|null|true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')/.exec(rest))) k = kindOfLiteral(r[1]);
        else if ((r = /\.(?:toBe|toEqual|toStrictEqual)\(\s*([^)]+?)\s*\)/.exec(rest))) k = kindOfLiteral(r[1]);
        if (k) { kinds.add(k); out.evidence.push(line.trim().slice(0, 140)); }
      }
    }
  }
  out.arities = [...arities].sort((a, b) => a - b);
  out.expect = [...kinds];
  return out;
}

/** The kinds a body's `return` statements can produce, or null per statement when unreadable. */
export function returnKinds(body) {
  const text = String(body ?? "");
  const rets = [...text.matchAll(/^[ \t]*return\b[ \t]*(.*)$/gm)].map((m) => m[1].trim().replace(/\s*#.*$/, "").replace(/;$/, ""));
  if (!rets.length) {
    if (/^\s*(?:raise|throw)\b/m.test(text)) return { kinds: ["raises"], known: true, returns: 0 };
    return { kinds: ["none"], known: true, returns: 0, fallsOff: true };
  }
  const kinds = rets.map((r) => {
    if (r === "") return "none";
    const lit = kindOfLiteral(r);
    if (lit) return lit;
    if (/^(?:not\b|!)/.test(r) || /(?:==|!=|<=|>=|(?<![<>-])<(?!<)|(?<![<>=-])>(?!>)|\bin\b|\bnot in\b|\bis\b|\bis not\b|\band\b|\bor\b)/.test(r) && !/\(/.test(r.replace(/\([^)]*\)/g, ""))) return "bool";
    if (/^(?:bool|isinstance|callable|all|any|startswith|endswith)\b|\.(?:startswith|endswith|isdigit|isalpha|isalnum|isupper|islower)\(/.test(r)) return "bool";
    if (/^(?:len|sum|int|float|abs|round|min|max|ord|count)\(/.test(r)) return "number";
    if (/^(?:str|repr|format)\(|\.(?:join|upper|lower|strip|format|replace)\(/.test(r)) return "str";
    return null; // unreadable: never grounds for a refusal
  });
  return { kinds, known: kinds.every((k) => k !== null), returns: rets.length };
}

/**
 * checkForm({ body, invariants }) → { wellFormed, verdict, deviations:[{kind, detail}], unlicensed:[...] }
 * verdict: "well-formed" | "deviates" (shape known and disjoint) | "unlicensed" (cannot be read).
 * The loop REFUSES only on "deviates".
 */
const showKind = (k) => (k === "none" ? "None" : k);

export function checkForm({ body, invariants } = {}) {
  const inv = invariants ?? {};
  const out = { schema: FORM_WITNESS_SCHEMA, wellFormed: true, verdict: "well-formed", deviations: [], unlicensed: [] };
  const expected = new Set(inv.expect ?? []);
  if (!expected.size && !inv.nonNull) { out.verdict = "unlicensed"; out.unlicensed.push("the deciding material states no expected shape"); return out; }
  const r = returnKinds(body);
  if (r.kinds.includes("raises") && r.kinds.length === 1) {
    out.wellFormed = false; out.verdict = "deviates";
    out.deviations.push({ kind: "no_value", detail: "the body only raises; the test expects a value" });
    return out;
  }
  if (!r.known) { out.verdict = "unlicensed"; out.unlicensed.push("a return expression's kind is not readable"); return out; }
  const have = new Set(r.kinds.filter((k) => k !== "raises"));
  // True == 1: a bool satisfies a number expectation, a number a bool one only when also expected
  const compatible = (k) => expected.has(k) || (k === "bool" && expected.has("number"));
  const anyCompatible = [...have].some(compatible);
  if (expected.size && !anyCompatible) {
    out.wellFormed = false; out.verdict = "deviates";
    out.deviations.push({ kind: "return_kind", detail: `the body can only return ${[...have].map(showKind).join("/")}${r.fallsOff ? " (it falls off the end)" : ""}; the test compares the result to ${[...expected].map(showKind).join("/")}` });
    return out;
  }
  if (inv.nonNull && have.size === 1 && have.has("none")) {
    out.wellFormed = false; out.verdict = "deviates";
    out.deviations.push({ kind: "null_result", detail: `the body can only return None${r.fallsOff ? " (it falls off the end)" : ""}; the test requires a non-None result` });
    return out;
  }
  return out;
}

/** The plain-words ground a deviation hands back to the slot DEF (never the answer, only the shape). */
export function deviationNote(unit, deviations = [], invariants = null) {
  const calls = (invariants?.evidence ?? []).slice(0, 3).map((e) => `  ${e}`).join("\n");
  return [`Shape check — before the test ran: ${deviations.map((d) => d.detail).join("; ")}.`, calls ? `The test calls ${unit} like this:\n${calls}` : null].filter(Boolean).join("\n");
}
