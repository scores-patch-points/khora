import { recognizerNominations } from "./prior-recognizer.js";

const asArray = (value) => value == null ? [] : Array.isArray(value) ? value : [value];

function priorHypotheses(prior, encounter, orientation) {
  if (!prior) return [];
  // A retained mind (EOReceivedPrior@1) is data, not code: its surface
  // recognizers are interpreted mechanically (kernel/prior-recognizer.js) —
  // the retained entries ride the same hypothesis channel as a function
  // prior, so the sealed mind can change perception without carrying
  // functions. Nomination only; witness still decides admission.
  if (prior.schema === "EOReceivedPrior@1") return recognizerNominations(prior, encounter, orientation);
  if (typeof prior.hypotheses !== "function") return [];
  if (typeof prior.applicability === "function" && !prior.applicability(encounter, orientation)) return [];
  return asArray(prior.hypotheses(encounter, orientation)).map((candidate) => ({
    ...candidate,
    nominationCause: [...asArray(candidate.nominationCause), "received_prior"],
    prior: { giver: prior.giver, provenance: prior.provenance },
  }));
}

// Orientation and priors may nominate candidates; they never admit observations.
export async function perceive(encounter, orientation, { perceivers = [], priors = [] } = {}) {
  const nominations = [];
  for (const prior of priors) nominations.push(...priorHypotheses(prior, encounter, orientation));
  for (const organ of perceivers) {
    const output = await organ.perceive(encounter, orientation, nominations);
    for (const candidate of asArray(output)) {
      nominations.push({
        schema: "PerceptCandidate@1",
        candidate: candidate.candidate ?? candidate,
        anchor: candidate.anchor ?? encounter.anchor,
        perceiver: candidate.perceiver ?? organ.id ?? "anonymous",
        nominationCause: asArray(candidate.nominationCause ?? "bottom_up_difference"),
        evidence: candidate.evidence ?? null,
        warrant: candidate.warrant ?? null,
      });
    }
  }
  return nominations.map((candidate) => candidate.schema === "PerceptCandidate@1" ? candidate : ({
    schema: "PerceptCandidate@1",
    candidate: candidate.candidate ?? candidate,
    anchor: candidate.anchor ?? encounter.anchor,
    perceiver: candidate.perceiver ?? "prior",
    nominationCause: asArray(candidate.nominationCause ?? "structural_prior"),
    evidence: candidate.evidence ?? null,
    warrant: candidate.warrant ?? null,
    prior: candidate.prior,
  }));
}
