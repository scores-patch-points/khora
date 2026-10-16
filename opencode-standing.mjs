// opencode-standing.mjs — the model's answer is a first draft; janus gives each of its sentences a standing.
// Each sentence of a finished answer is PROPOSED as a claim (giver: the agent), then ASSESSED by a named
// instrument: opencode-eot.groundCheck, the log and the disk, never the model. The spiral (janus
// organs/reasoning-spiral.js) projects the standing; a verdict is an attestation by that instrument, not a
// truth oracle. A sentence the instrument cannot test stays `unresolved`, said plainly, never promoted.
// janus is a sibling checkout; without it the door still runs and an answer simply carries no standing.
const spiral = await import("../janus/native/organs/reasoning-spiral.js").catch(() => null);

const BY = "khora:opencode-eot.groundCheck";

/** standingOf({ agent, n, ground }) → { log, counts, refuted:[text], claims }
 *  `ground` is groundCheck's result: { sentences:[{text,type}], flags:[{kind,detail}] }. */
export function standingOf({ agent, n = 0, ground }) {
  if (!spiral) return { log: [], counts: { supported: 0, licensed: 0, refuted: 0, unresolved: 0 }, refuted: [], claims: 0 };
  const { appendReasoning, reasoningAt } = spiral;
  const sentences = ground?.sentences ?? [];
  const flags = ground?.flags ?? [];
  let log = [];
  sentences.forEach((s, i) => {
    const id = `${String(agent).replace(/^ses_/, "").slice(0, 8)}.t${n}.s${i}`;
    const text = String(s.text ?? "");
    const hit = flags.find((f) => (f.kind === "unknown_path" && text.includes(f.detail)) || (f.kind === "unverified_pass" && text.startsWith(f.detail.slice(0, 40))));
    log = appendReasoning(log, { kind: "propose", id, forWhom: String(agent), giver: String(agent), relation: { subject: String(agent), verb: "said", object: text.slice(0, 160) } });
    const verdict = hit ? "refuted" : s.type === "grounded" ? "supported" : "unresolved";
    log = appendReasoning(log, {
      kind: "assess", id, verdict, method: "deduction", by: BY, license: "rule:ground",
      basis: hit ? `${hit.kind}: ${String(hit.detail).slice(0, 80)}` : s.type === "grounded" ? "overlaps a witnessed event" : `${s.type}: no witnessed event to test it`,
    });
  });
  const claims = reasoningAt(log).claims;
  const counts = { supported: 0, licensed: 0, refuted: 0, unresolved: 0 };
  for (const c of claims) counts[c.standing] = (counts[c.standing] ?? 0) + 1;
  const refuted = claims.filter((c) => c.standing === "refuted").map((c) => c.id);
  return { log, counts, refuted, claims: claims.length };
}
