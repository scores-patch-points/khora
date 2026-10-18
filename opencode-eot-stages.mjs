// The EOT stage vocabulary, in one place so both the log (opencode-eot.mjs) and its derived binary
// index (opencode-eot-index.mjs) read the SAME ordinals. Extracted from opencode-eot.mjs to keep the
// dependency acyclic: the index is imported by the log, so the log cannot import the index's source.
export const STAGES = Object.freeze(["read", "turn", "mark", "claim", "done", "draw", "hunt", "refuse", "verify", "admit", "reject", "reason", "flag", "ibid", "contend", "edit", "exec", "wt"]);
