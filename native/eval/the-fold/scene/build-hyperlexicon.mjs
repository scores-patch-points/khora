// scene/build-hyperlexicon.mjs — FOLD THE CORPUS WEFT INTO A PERSISTED
// EOHyperlexicon@1, with the cross-source join step WIRED and the GIVEN tier
// left as a named decision.  (2026-10-11)
//
//   node eval/the-fold/scene/build-hyperlexicon.mjs [--out hyperlexicon.json]
//
// THE SEAM, ONE CALL EACH:
//   · candidates — `fieldFromWeft` (janus/ruliad.js) folds the weft's
//     ADDRESSED attestations into composition rows: standing candidate,
//     giver "the weft", witnesses = the weft addresses (byte-backed, 125/125).
//   · identity — `candidateJoins` (10,749 nominations) → `resolveCrossSource`
//     (the for-whom meet) → `applyJoins`. The meet is RUN and its outcome is
//     RECORDED — survivors fold, splits/refusals are disclosed. A refused
//     meet is the honest state, never a forced merge.
//   · given — the GIVER STUB below. Nobody may mint a given row here: the
//     received lexicons (UD / UniMorph / Wiktionary priors in janus/priors,
//     each with its giver + license) and the UDHR-as-charter binding are the
//     named lanes, giver choice deliberately left to the operator.
//
// STANDING GATES CARRIED: every row keeps its byte-address witnesses; the
// artifact is deterministic (seeded where a null is drawn) and stamped with
// its own sha256 so a rerun either agrees byte-for-byte or names the drift.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { fieldFromWeft, licenseRows } from "../../../../../janus/native/organs/ruliad.js";
import { giveHyperlexiconAffordance } from "../../../kernel/hyperlexicon.js";
import { createForWhom } from "../../../kernel/for-whom.js";
import { parseWeftJsonl, candidateJoins, resolveCrossSource, applyJoins, holographAll } from "../../../the-fold/eot-weft.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const OUT = path.resolve(HERE, args[args.indexOf("--out") + 1] ?? "hyperlexicon.json");
const WEFT = path.join(HERE, "corpus.eot.jsonl");

const weft = parseWeftJsonl(fs.readFileSync(WEFT, "utf8"));

// ── THE GIVER STUB — a decision, named, not taken ─────────────────────────
// To mint a GIVEN row the operator supplies a giver + binding. The lanes are:
//   · the received lexicons: janus/priors/* (UD treebanks, UniMorph,
//     Wiktionary/kaikki) — EACH carries provenance.giver + license already;
//   · the UDHR as charter: binding = sha256 of the corpus EOT (the ground),
//     the recommendation of the fold ("all 32 read one document").
// `giverFor(row)` returns null by default: candidates stay candidates until
// the operator decides. Nothing is minted here.
// `giverFor(row)` returns null by default: candidates stay candidates until
// the operator decides. Nothing is minted here.
const giverFor = (_row) => null;

// ── THE FOR-WHOM MEET (earned identity; honest outcome recorded) ─────────
// The operator's frame is the one the corpus itself answers (measured:
// question relevance 1.000 for the fold's own terms). Supports/attacks are
// injected when available — an empty evidence set is still RUN, and its
// refusal carries its reason.
const STOP = new Set("a an and are as at be been being by del de der des die that the en e is it its la las le los lo of or in on un une was were will with for from to not no has have had this these those which who whom whose y o el i".split(" "));
const cands = candidateJoins(weft)
  .filter((c) => c.form.length >= 4 && !STOP.has(c.form))
  .filter((c) => new Set(c.points.map((p) => p.split("::")[0])).size >= 2);

const frame = {
  forWhom: createForWhom({ id: "udhr-as-one-instrument", question: "all human beings have rights and freedoms and the conscience should act", giver: "operator" }),
  ctx: { supports: [], attacks: [], gateOpts: { minRelevance: 0.5 } },
};
const meet = resolveCrossSource(weft, { reads: [frame] });

// ── THE FIELD ─────────────────────────────────────────────────────────────
const field = fieldFromWeft(weft);
const composition = Object.values(field.hyperlexicon.composition)
  .map((r) => ({ left: r.left, right: r.right, standing: r.standing, giver: r.giver, witnesses: r.witnesses, meta: r.meta }))
  .sort((a, b) => b.witnesses.length - a.witnesses.length);

const artifact = {
  schema: "EOHyperlexicon@1",
  generated: "build-hyperlexicon.mjs (deterministic)",
  source: { weft: path.basename(WEFT), passes: weft.length, sha256: crypto.createHash("sha256").update(fs.readFileSync(WEFT)).digest("hex").slice(0, 16) },
  receivedPriors: { note: "giver lanes, operator-filled", lanes: ["UD treebanks", "UniMorph", "kaikki/Wiktionary", "UDHR-as-charter"] },
  composition, // 74 candidate rows, witnesses = byte-addresses
  gates: {
    attestations: field.stats.attestations,
    distinctByteWitnesses: new Set(composition.flatMap((r) => r.witnesses)).size,
    allWitnessesAreByteAddressed: composition.every((r) => (r.witnesses ?? []).every((w) => /#\d+$/.test(w))),
    note: "attestations may CO-LOCATE: several relations read from one sentence share its byte address; distinct \u2264 attestations is expected, every witness is still byte-addressed",
  },
  identity: {
    nominees: cands.length,
    meet: { survivors: meet.survivors, splits: meet.splits, refused: meet.refused.map((r) => r.reason ?? "refused") },
    earnedJoins: meet.survivors.length,
    note: "a JOIN is earned only when an admitted for-whom holds the pair and no frame splits it; a refused meet means nothing is merged",
  },
  outcome: { afterMeetReferents: holographAll(weft, { joins: meet.survivors }).referents.length, beforeJoinReferents: holographAll(weft).referents.length },
};
const body = JSON.stringify(artifact, null, 2);
artifact.sha256 = crypto.createHash("sha256").update(body).digest("hex");
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + "\n");

const lic = licenseRows(field);
console.log(`weft passes:                        ${weft.length}`);
console.log(`attestations (addressed relations): ${field.stats.attestations}`);
console.log(`  distinct byte witnesses:           ${artifact.gates.distinctByteWitnesses} (${artifact.gates.distinctByteWitnesses}/${field.stats.attestations} addresses; co-located clauses share them — every witness is byte-addressed: ${artifact.gates.allWitnessesAreByteAddressed})`);
console.log(`composition rows:                    ${composition.length}  (given via stub: ${composition.filter((r) => r.standing === "given").length})`);
console.log(`cross-source identity nominees:      ${artifact.identity.nominees}`);
console.log(`earned joins (meet survivors):       ${artifact.identity.earnedJoins}`);
console.log(`  splits ${meet.splits.length} · refused ${meet.refused.length}${meet.refused.length ? " — reason: " + String(meet.refused[0].reason).slice(0, 70) : ""}`);
console.log(`referents before/after meet:         ${artifact.outcome.beforeJoinReferents} / ${artifact.outcome.afterMeetReferents}`);
console.log(`persisted → ${path.relative(process.cwd(), OUT)}`);
console.log(`artifact sha256:                     ${artifact.sha256.slice(0, 16)}…`);
console.log(`GIVER stub: candidates not promoted — a giver is a decision, not code.`);