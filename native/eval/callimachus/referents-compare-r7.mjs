#!/usr/bin/env node
// eval/callimachus/referents-compare-r7.mjs — evaluates E1-E5 of GRAIN-R7-PREREG.md from the two runs of grain-referents-r7.mjs
// (REFERENT_MATCH=contains and run) and, for E4, a baseline produced by the code BEFORE the change (origin/main at 4050e1c7).
//   node referents-compare-r7.mjs <contains.json> <run.json> <baseline.json>
import { readFileSync, writeFileSync } from "node:fs";
const [cPath, rPath, bPath] = process.argv.slice(2);
const C = JSON.parse(readFileSync(cPath, "utf8")), R = JSON.parse(readFileSync(rPath, "utf8")), B = JSON.parse(readFileSync(bPath, "utf8"));
const out = { prereg: "native/eval/callimachus/GRAIN-R7-PREREG.md", predictions: {}, reported: {} };
let stdTime0Hoist;
const senate = C.entities.find((e) => e.surfaces.includes("Senate"))?.id, house = C.entities.find((e) => e.surfaces.includes("House"))?.id;
const find = (X, re) => X.atoms.filter((a) => re.test(a.sentence));
// E1
const nevC = find(C, /Nevada Senate passed Nevada Assembly Joint Resolution 4/)[0], nevR = find(R, /Nevada Senate passed Nevada Assembly Joint Resolution 4/)[0];
out.predictions.E1 = { contains: { subj: nevC?.subj }, run: { subj: nevR?.subj }, senateReferent: senate, holds: !!nevC && !!nevR && nevC.subj === senate && nevR.subj !== senate };
// E2
const sC = C.asks[1], sR = R.asks[1];
const nevCarries = (X) => X.carriers.some((c) => /Nevada Senate/.test(c.text));
out.predictions.E2 = { containsCarriesNevada: nevCarries(sC), runCarriesNevada: nevCarries(sR), runCarriers: sR.carriers.map((c) => c.text), holds: !nevCarries(sR) };
// E3: the resolver, on the phrases the registration names, against the record's own referents
const shortRefs = new Set([senate, house, stdTime0(R)].filter(Boolean));
function stdTime0(X) { return X.entities.find((e) => e.surfaces.includes("Standard Time"))?.id; }
const e3 = R.phraseChecks.map((p) => ({ phrase: p.phrase, names: p.names, resolvesToShorter: p.refs.some((x) => shortRefs.has(x)) }));
const e3c = C.phraseChecks.map((p) => ({ phrase: p.phrase, names: p.names }));
out.predictions.E3 = { run: e3, contains: e3c, violations: e3.filter((x) => x.resolvesToShorter).length, holds: e3.every((x) => !x.resolvesToShorter) };
out.reported.keptAndLost = { run: R.keptChecks.map((p) => ({ phrase: p.phrase, names: p.names })), contains: C.keptChecks.map((p) => ({ phrase: p.phrase, names: p.names })) };
// E4
const key = (X) => JSON.stringify({ atoms: X.atoms.map((a) => [a.id, a.subj, a.objRefs, a.entities]), claims: X.claimsKeys, entities: X.entities.map((e) => [e.id, e.name, e.surfaces]) });
out.predictions.E4 = { contains_equals_baseline: key(C) === key(B), atoms: [C.atoms.length, B.atoms.length], holds: key(C) === key(B) };
// E5
const hR = R.asks[0];
out.predictions.E5 = { answer: hR.after.answer, contested: hR.after.rival, carriers: hR.carriers.length, window: hR.window, holds: hR.after.answer === "2026" && hR.after.rival === false && hR.carriers.length >= 2 };
// reported
const diffs = [];
const idx = new Map(R.atoms.map((a) => [a.id, a]));
for (const a of C.atoms) { const b = idx.get(a.id); if (!b) continue; if (a.subj !== b.subj || JSON.stringify(a.objRefs) !== JSON.stringify(b.objRefs) || JSON.stringify(a.entities) !== JSON.stringify(b.entities)) diffs.push({ id: a.id, sentence: a.sentence.slice(0, 90), subj: [a.subj, b.subj], objRefs: [a.objRefs, b.objRefs] }); }
out.reported = { ...out.reported, atomsWhoseReferentsChanged: diffs.length, atoms: C.atoms.length, claimsByStanding: { contains: C.claimsByStanding, run: R.claimsByStanding }, claimsTotal: [C.claimsKeys.length, R.claimsKeys.length], sampleChanged: diffs.slice(0, 12), houseAsk: { contains: { carriers: C.asks[0].carriers.length, answer: C.asks[0].after.answer }, run: { carriers: R.asks[0].carriers.length, answer: R.asks[0].after.answer } }, senateAsk: { contains: sC.carriers.map((c) => c.text.slice(0, 90)), run: sR.carriers.map((c) => c.text.slice(0, 90)) } };
console.log(JSON.stringify(out, null, 1));
if (process.argv[5]) writeFileSync(process.argv[5], JSON.stringify(out, null, 1));
