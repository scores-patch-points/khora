// opencode-ethos.mjs — the CLOSURE CHECK, in shadow (FOLD_ETHOS). Structural, over typed fields, with the standing of a
// code seam: never a phrase list, never a prompt. One law: every consequence has a path home to a decider, and no
// being's standing is traded for task completion. It judges a row's declared fields; it does not read wording.
//
//   C1 affected parties named     a row that changes or reads something about a person carries `affects` resolving to a
//                                 referent with standing in the log, else typed gap `affected_unnamed`, not admitted.
//   C2 no inference from absence  a claim about a person whose only basis is refusal, absence, silence or confidentiality
//                                 is refused. ACCOUNTABILITY IS NOT HARM: a witnessed, public-record claim about an
//                                 official in their official capacity passes (restricting an action is not denying standing).
//   C3 no silent essence          a source attribute promoted to a standing identity claim needs its register and a
//                                 supersedes chain, else flagged (admitted, disclosed).
//   C4 standing is not traded for usefulness — no mechanical form yet. It ships as a DISCLOSED GAP, not a guess.
//
// The rules are data (RULES), so a test can break one and see the test fail (mutation check). Shadow: verdicts are logged
// to the ledger as EthosClosure@1 rows (a verdict that is not `pass` only — a pass is the default, not a record).
import { append, lean } from "./opencode-ledger.mjs";

export const ETHOS_ON = () => (process.env.FOLD_ETHOS ?? "0") !== "0";
export const C4_GAP = Object.freeze({ rule: "C4", gap: "no_mechanical_form", note: "standing is not traded for usefulness: disclosed gap, not a guess" });
const ABSENCE = new Set(["refusal", "absence", "silence", "confidential", "confidentiality"]);

export const RULES = Object.freeze([
  { id: "C1", check: (row, { known }) => (row.aboutPerson && !(row.affects && known(row.affects)) ? { verdict: "refuse", gap: "affected_unnamed" } : null) },
  {
    id: "C2",
    check: (row) => {
      if (!row.personClaim || !ABSENCE.has(row.basis)) return null;
      const accountability = row.officialCapacity && row.witnessed && row.publicRecord;
      return accountability ? null : { verdict: "refuse", gap: "inference_from_absence" };
    },
  },
  { id: "C3", check: (row) => (row.promotesIdentity && !(row.register && row.supersedes && row.supersedes !== "none") ? { verdict: "flag", gap: "silent_essence" } : null) },
]);

/** closureCheck(row, { known, rules }) → { ok, verdict, findings:[{rule,gap,verdict}], disclosed:[C4] }. */
export function closureCheck(row, { known = () => false, rules = RULES } = {}) {
  const findings = [];
  for (const r of rules) { const f = r.check(row ?? {}, { known }); if (f) findings.push({ rule: r.id, ...f }); }
  const verdict = findings.some((f) => f.verdict === "refuse") ? "refuse" : findings.length ? "flag" : "pass";
  return { ok: verdict !== "refuse", verdict, findings, disclosed: [C4_GAP] };
}

/** Shadow hook: run the check on an admit's typed `closure` fields and log a non-pass verdict. Never blocks. */
export function ethosShadow({ task, referent, block = null, closure, known, rules } = {}) {
  const res = closureCheck(closure, { known, rules });
  if (res.verdict !== "pass") {
    append(task, { schema: "EthosClosure@1", op: "EVA", task, referent, block, reader: "ethos", register: "witnessed", generation: 0, ...lean(task, { layer: "ethos", con: res.findings.map((f) => [referent, f.gap, f.rule]), eva: [] }), m: { verdict: res.verdict, findings: res.findings } });
  }
  return res;
}
