// integration/disclosure.js — the disclosure control (Milestone 7).
//
// Public answers disclose limits without disclosing protected material or
// falsely claiming exhaustive evidence. The disclosure control produces the
// HONEST LIMITED PUBLIC ACCOUNT from a trace: what may be said, what is held
// under a disclosure scope, and what is not known. It never claims complete
// knowledge, and it never turns a withheld identity into an observed one.
//
// The falsification-battery row this answers: "Confidential corrective
// witness — honest limited public account. Disproof: disclosure or false claim
// of complete knowledge."

import { replay } from "./replay.js";

export const DISCLOSURE_SCHEMA = "DisclosureAccount@1";
export const DISCLOSURE_VERSION = 1;

/**
 * publicAccount(trace) — the honest limited account:
 *   { disclosed, withheld, notKnown, participants }
 * - `disclosed` is what the trace licenses the fold to assert publicly.
 * - `withheld` names what is held under a disclosure scope (never its content).
 * - `notKnown` names what the trace does not establish — a claim of complete
 *   knowledge would be false, so the account says so.
 * - `participants` shows whose account EXISTS (observed) and whose does not
 *   (withheld / unresolved) — never populating an absent perspective.
 */
export function publicAccount(trace) {
  const { projection } = replay(trace);
  const disclosed = [];
  const withheld = [];
  const notKnown = [];
  const participants = [];

  for (const encounter of projection.encounters) {
    for (const p of encounter?.participants ?? []) {
      if (p.kind === "observed") {
        participants.push({ bearer: p.identity ?? "observed", exists: true });
        disclosed.push(`${p.identity ?? "an observed participant"} appears in the record`);
      } else if (p.kind === "withheld") {
        participants.push({ bearer: p.identity ?? "a withheld participant", exists: false, held: true });
        withheld.push("a participant declined to be identified");
      } else {
        participants.push({ bearer: p.identity ?? "an unresolved referent", exists: false });
        notKnown.push("a referent was mentioned but not identified");
      }
    }
    // Disclosure scope: what the encounter admits is disclosed; what it
    // excludes is held — named as a limit, never as a gap in our knowledge.
    for (const scope of encounter?.disclosure_scope ?? []) {
      disclosed.push(`material admitted under ${scope}`);
    }
  }

  for (const revision of projection.revisions) {
    disclosed.push(`plan revised on ${revision.record?.effect_forecasts?.[0]?.effect ?? "recorded grounds"}`);
  }
  for (const completion of projection.completions) {
    if ((completion.record?.completion_state ?? completion.completion_state) === "left_alone") {
      disclosed.push("an inquiry was left alone — a completed disposition, not a failure");
    }
  }
  for (const response of projection.responses) {
    if (response.record?.refusal === true || String(response.record?.actual_response ?? "").toLowerCase() === "declined") {
      withheld.push(`${response.record.responder} declined a further inquiry`);
    }
  }

  // The account never claims exhaustive evidence. If anything was withheld or
  // unknown, that is named; if nothing was, the account still says what it
  // does NOT cover.
  notKnown.push("this account covers only what the trace establishes; it is not an exhaustive account of any participant");

  return {
    schema: DISCLOSURE_SCHEMA,
    version: DISCLOSURE_VERSION,
    disclosed,
    withheld,
    notKnown,
    participants,
    claimsComplete: false,
  };
}

export const DISCLOSURE = {
  schema: DISCLOSURE_SCHEMA,
  version: DISCLOSURE_VERSION,
  account: publicAccount,
  describe: "public answers disclose limits without disclosing protected material or falsely claiming exhaustive evidence",
};