// opencode-ledger-check.mjs — THE LEDGER CHECKER: what a finished answer says against what the
// task's own settled turns already heard. Mechanical (predigest + the text face of the notes
// ledger), model-free, display-only: its flags ride the door's ground answer and the facing row
// renders them; nothing here changes a model's words, decides truth, or blocks a turn (a check
// that fails returns a typed gap, and the door answers the ground as if it had not run).
//
// The check, in the ledger's own terms: the task's turns (opencode-worknotes .turns.md — the same
// record the context note reads) are HEARD into a fresh notes ledger with per-turn witnesses; the
// finished answer is then ADMITTED against it. An arrangement heard before is a RE-SIGHTING (SYN —
// one note, witnesses unioned, never two notes); an arrangement this answer DENIES that stands on
// the ledger is a CONTEST (S69 — a cut meeting its link, landed at the door); anything else is
// new, and new is not a flag.
//
// WHAT THIS IS: the sentence-grain rung the OxF falsification (content-rules, 2026-10-16) left
// open — overreach-without-negation passes the lexical groundCheck, and a cross-turn contradiction
// passes it entirely (groundCheck has no memory of prior turns; this does).
// WHAT THIS IS NOT: entailment at meaning grain (unfinished). It sees sighting, denial, and
// novelty — never support. And its edges are the ENGLISH text face's (predigest over the received
// en priors): a language lens is a change of face, not of the kernel — the notes ledger beneath is
// medium-blind, and a non-English reading needs its own predigest, never its grammar smuggled here.
import { predigest, loadRegister } from "./opencode-predigest.mjs";
import * as taskLog from "./native/kernel/task-log.js";
import { makeHyperlexicon } from "./native/organs/hyperlexicon.js";

// The window heard: the last turns of the task, bounded — a check is O(turns) and the medium's own
// record keeps everything else. FOLD_LEDGER_TURNS raises it.
const CAP_TURNS = Number(process.env.FOLD_LEDGER_TURNS ?? 40);

/** The sentence spans of a text, split the way predigest splits them — so an edge's `at` lands in
 *  the same sentence the predigest read it in. */
function sentenceSpans(text) {
  const s = String(text ?? "");
  const starts = [0];
  for (const m of s.matchAll(/[.!?]\s+/g)) starts.push(m.index + m[0].length);
  return starts.map((start, i) => ({ start, end: i + 1 < starts.length ? starts[i + 1] : s.length }));
}

const sentenceAt = (text, at) => {
  const s = String(text ?? "");
  const spans = sentenceSpans(s);
  let k = 0;
  while (k + 1 < spans.length && spans[k + 1].start <= at) k++;
  return s.slice(spans[k].start, spans[k].end).trim();
};

/** The relations predigest reads off a text, in the text face's edge shape — each carrying the
 *  sentence it was read in as its span, addressed `<source>#<at>` (the ledger's witness grammar:
 *  a span must start with its source, so a cut's span points back at its denier). */
export function edgesOf(text, source) {
  const s = String(text ?? "");
  const d = predigest(s, { level: 2 });
  return d.con.map(([e1, label, e2, at, neg]) => {
    const addr = `${source}#${at}`;
    const span = sentenceAt(s, at) || s.slice(at, at + 40);
    return { subject: e1, verb: label, object: e2, polarity: neg ? "-" : "+", spans: [{ text: span, ref: addr, at: addr }] };
  });
}

/**
 * checkAnswer({ turns, text, capTurns }) → { ok, summary, flags, gap }
 *   summary: { edges, retold, new, contested }
 * Pure and deterministic: same turns + text → byte-identical report. `turns` are the worknotes
 * turn records ({ n, text } — `answer` also read); the newest capTurns by n are heard.
 */
export function checkAnswer({ turns = [], text = "", capTurns = CAP_TURNS } = {}) {
  try {
    // Without the received priors the predigest reads no relations, the ledger hears nothing, and
    // the check would pass everything silently — so a missing register is a TYPED GAP, never a
    // clean bill (the predigest's own PD0 law: a missing prior is a typed gap, not a bare reader).
    const reg = loadRegister();
    if (reg.gap) return { ok: false, summary: null, flags: [], gap: `no-priors: ${JSON.stringify(reg.gap)} (set FOLD_ENG_PRIOR_DIR/FOLD_POS_PRIOR)` };
    const answer = String(text ?? "");
    const heard = [...(turns ?? [])]
      .filter((t) => t && String(t.text ?? t.answer ?? "").trim().length > 0)
      .sort((a, b) => (Number(a.n) || 0) - (Number(b.n) || 0))
      .slice(-Math.max(0, capTurns));

    const hl = makeHyperlexicon(taskLog);
    // The reader's standing, declared before anything is heard (no view from nowhere) — no clock
    // and no paths, so the report is deterministic across runs.
    let log = hl.createHyperlexicon({ frame: { reader: "khora:opencode-ledger-check", hears: "task turns", admits: "the finished answer" } });

    for (const t of heard) {
      const src = `turn-${t.n}${t.agent ? `@${t.agent}` : ""}`;
      const edges = edgesOf(String(t.text ?? t.answer ?? ""), src);
      if (edges.length) log = hl.admit(log, edges, { witness: src }).log;
    }

    const before = new Map(hl.foldHyperlexicon(log).map((n) => [n.id, n]));
    const edges = edgesOf(answer, "answer");
    if (!edges.length) return { ok: true, summary: { edges: 0, retold: 0, new: 0, contested: 0 }, flags: [], gap: null };

    const r = hl.admit(log, edges, { witness: "answer" });
    let retold = 0;
    let fresh = 0;
    for (const h of r.heard ?? []) {
      if (h.cut) continue;
      if (before.has(h.id)) retold++;
      else fresh++;
    }
    const flags = [];
    for (const c of (r.contests ?? []).filter((x) => !x.noop)) {
      const note = before.get(c.link) ?? null;
      const what = note ? `${note.subject ?? note.end1} ${note.verb ?? note.label} ${note.object ?? note.end2}` : c.link;
      const sources = [...new Set((note?.witnesses ?? []).map((w) => String(w)))].join(", ") || "an earlier turn";
      flags.push({
        kind: "ledger_contested",
        detail:
          c.source === "answer"
            ? `this answer denies "${what}" — heard from ${sources}; the note still stands (a denial is a cut, not proof)`
            : `this answer reasserts "${what}", denied by ${c.source}; the contest still stands`,
      });
    }
    return { ok: true, summary: { edges: edges.length, retold, new: fresh, contested: flags.length }, flags, gap: null };
  } catch (e) {
    return { ok: false, summary: null, flags: [], gap: String(e?.message ?? e) };
  }
}
