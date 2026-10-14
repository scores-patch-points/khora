// scene/build-hyperlexicon.mjs — FOLD THE CORPUS WEFT INTO A PERSISTED
// EOHyperlexicon@1, with the cross-source join step WIRED and the GIVEN tier
// WIRED through given-lanes.mjs.  (2026-10-11; given tier 2026-10-14)
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
//   · given — given-lanes.mjs, two lanes under ONE law (a given row needs a
//     named giver AND a ground; licenseStanding is the wall):
//       charter  — the UDHR's own modal clauses re-found at their bytes and
//                  bound to the digest of the charter's bytes. MINTS typed
//                  structural rows (bearer × consequence), never charter words.
//       lexicons — UD / UniMorph / Wiktionary priors in janus/priors. A
//                  lexicon says what a form IS, not what two ends may compose
//                  into, so this lane ATTESTS (candidate ends' nominal
//                  standing against a same-document null) and mints nothing.
//
// STANDING GATES CARRIED: every row keeps its byte-address witnesses; the
// artifact is deterministic (seeded where a null is drawn) and stamped with
// its own sha256 so a rerun either agrees byte-for-byte or names the drift.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { fieldFromWeft, licenseRows, giveRule } from "../../../../../janus/native/organs/ruliad.js";
import { giveHyperlexiconAffordance } from "../../../kernel/hyperlexicon.js";
import { readCharter, lexicalLane } from "./given-lanes.mjs";
import { createForWhom } from "../../../kernel/for-whom.js";
import { parseWeftJsonl, candidateJoins, resolveCrossSource, applyJoins, holographAll } from "../../../the-fold/eot-weft.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const OUT = path.resolve(HERE, args[args.indexOf("--out") + 1] ?? "hyperlexicon.json");
const WEFT = path.join(HERE, "corpus.eot.jsonl");

const weft = parseWeftJsonl(fs.readFileSync(WEFT, "utf8"));

// ── THE GIVEN TIER — named givers, grounds, nulls (given-lanes.mjs) ───────
// Seeded from the weft's own digest so a rerun agrees byte-for-byte.
const SEED = parseInt(crypto.createHash("sha256").update(fs.readFileSync(WEFT)).digest("hex").slice(0, 8), 16);
const PRIORS = path.resolve(HERE, "../../../../../janus/priors");
const INJUNCTIONS = "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/udhr-injunctions-v1.json";
const CONTROL = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt";

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
const candidates = Object.values(field.hyperlexicon.composition)
  .map((r) => ({ left: r.left, right: r.right, standing: r.standing, giver: r.giver, witnesses: r.witnesses, meta: r.meta }))
  .sort((a, b) => b.witnesses.length - a.witnesses.length);

// charter lane — through the kernel's own door (giveRule throws without a giver), then the wall
const udhrPath = path.join(HERE, "udhr-src", "udhr-eng.txt");
const charterRead = readCharter({ udhrPath, injunctionsPath: INJUNCTIONS, controlPath: CONTROL, seed: SEED });
const mintable = charterRead.gates.verifiedAtBytes > 0 && charterRead.gates.modalStrippedClauses === 0 && charterRead.gates.charterBeatsControl !== false;
let hl = field.hyperlexicon;
const refusedGroups = [];
if (mintable) {
  for (const g of charterRead.groups) {
    hl = giveRule(hl, {
      left: `bearer:${g.bearer}`, right: `consequence:${g.kind}`,
      giver: charterRead.giver, binding: charterRead.charter.sha256,
      witnesses: g.witnesses.map((n) => `${udhrPath}#${n}`).sort(),
      meta: { lane: "charter", members: g.members, use: "composition affordance only — never a search, ground or vocabulary source" },
    });
  }
} else refusedGroups.push({ why: "charter gates not met", gates: charterRead.gates });
const wall = licenseRows(hl, charterRead.charter);
const givenRows = wall.filter((r) => r.standing === "given");

// lexicon lane — attests, mints nothing
const lexical = lexicalLane({ composition: candidates, priorsDir: PRIORS, seed: SEED });
const composition = [
  ...candidates,
  ...givenRows.map((r) => ({ left: r.left, right: r.right, standing: r.standing, giver: r.giver, binding: r.binding, witnesses: r.witnesses, license: { licensed: r.license.licensed, tier: r.license.tier }, meta: r.meta })),
];

const artifact = {
  schema: "EOHyperlexicon@1",
  generated: "build-hyperlexicon.mjs (deterministic)",
  source: { weft: path.basename(WEFT), passes: weft.length, sha256: crypto.createHash("sha256").update(fs.readFileSync(WEFT)).digest("hex").slice(0, 16) },
  receivedPriors: {
    note: "given tier wired 2026-10-14 (given-lanes.mjs): the charter lane mints; the lexicon lane attests and mints nothing",
    lanes: ["UD treebanks", "UniMorph", "kaikki/Wiktionary", "UDHR-as-charter"],
  },
  given: {
    schema: "GivenTier@1",
    charter: {
      id: charterRead.charter.id, sha256: charterRead.charter.sha256, bytes: charterRead.charter.bytes, giver: charterRead.giver,
      minted: givenRows.length, licensed: givenRows.filter((r) => r.license.licensed).length,
      groups: charterRead.groups.map((g) => ({ bearer: g.bearer, kind: g.kind, members: g.members })),
      unverified: charterRead.unverified, refused: refusedGroups,
      gates: charterRead.gates, controls: charterRead.controls, null: charterRead.null,
      note: "row ends are typed structural keys, not charter words; a row licenses composition only where the declaration itself states it",
    },
    lexicons: lexical,
  },
  composition, // candidate rows (witnesses = byte-addresses) then the charter's given rows
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
console.log(`GIVEN tier — charter: ${givenRows.length} rows minted, ${givenRows.filter((r) => r.license.licensed).length} licensed (binding ${charterRead.charter.sha256.slice(0, 12)}…, ${charterRead.gates.verifiedAtBytes}/${charterRead.gates.priorObligations} obligations verified at bytes, ${charterRead.gates.unverified} unverified)`);
console.log(`  null: chance base rate ${charterRead.null.chanceBaseRate.toFixed(3)} · modal-stripped clauses ${charterRead.gates.modalStrippedClauses} · control ${charterRead.controls.control ? charterRead.controls.control.rate.toFixed(3) : "n/a"} · charter beats control: ${charterRead.gates.charterBeatsControl}`);
console.log(`GIVEN tier — lexicons: ${lexical.lanes.length} languages attested (mints 0), ${lexical.gaps.length} typed gaps`);
for (const l of lexical.lanes) console.log(`  ${l.code.padEnd(14)} ${l.tier.padEnd(10)} ends ${String(l.ends).padStart(3)}  attested ${l.attested.observed.toFixed(2)} (null ${l.attested.nullMean.toFixed(2)})  nominal ${l.nominal.observed.toFixed(2)} (null ${l.nominal.nullMean.toFixed(2)}, ceiling ${l.nominal.nullMax.toFixed(2)}${l.nominal.exceedsNull ? " — above" : ""})`);
for (const g of lexical.gaps) console.log(`  ${g.code.padEnd(14)} GAP  ${g.why}`);