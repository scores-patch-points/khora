// loaders/_sibling-rr-diag.mjs — NEW diagram pockets for the sibling replication of comp.rigidR: HELD-OUT documents of the BPMN lineages of /private/tmp/claude-501/notation/uml_bpmn/corpus (underscore: ignored by run-atlas.mjs).
// The atlas pockets cd-bpmn-miwg / -kogito / -activiti took whole files in sha256(cd-<lineage>:fileIndex) order up to the 300k-token cap (loaders/_cd_notation3.mjs); the files it did NOT take are the material here.
// The atlas selection is re-derived with the atlas's own takeDocs (same ids, same candidate lists, same tokeniser codeText) so the two sets are disjoint by construction; leftover files byte-identical to a file the atlas took
// (or to an earlier leftover) are dropped and counted. Self-contained copy of the logic of an earlier sibling loader (_sibling-bpmn.mjs); only atlas helpers are imported.
// HONEST LIMIT: held-out DOCUMENTS of the same exporter families, not a new diagram world: they test sampling stability, not generality. cd-dot, cd-mermaid, cd-sbgn and cd-bpmn-camunda were read whole by the atlas (nothing left).
import fs from "node:fs";
import { sha256 } from "../lib/pocket.mjs";
import { codeText, newStats, takeDocs, sortedFiles, readText, makePocket } from "./_cd_util.mjs";

const UB = "/private/tmp/claude-501/notation/uml_bpmn/corpus";
const LINEAGES = [
  { k: "bpmn-miwg", re: /\/bpmn-miwg-test-suite--/, label: "BPMN 2.0 XML, BPMN MIWG test suite (many vendors' exporters)" },
  { k: "bpmn-kogito", re: /\/kogito-(runtimes|examples)--/, label: "BPMN 2.0 XML from Kogito (jBPM lineage)" },
  { k: "bpmn-activiti", re: /\/(Activiti|flowable-engine)--/, label: "BPMN 2.0 XML from Activiti and Flowable" },
];
export const IDS = LINEAGES.map((l) => `rr-${l.k}-heldout`);
const fileHash = (f) => sha256(fs.readFileSync(f));
let _all = null;
const allFiles = () => (_all ??= ["train", "dev", "test"].flatMap((s) => sortedFiles(`${UB}/${s}`, (f) => f.endsWith(".txt"))));

export async function load(onlyIds = null) {
  const out = [];
  if (!fs.existsSync(UB)) return out;
  for (const L of LINEAGES) {
    const id = `rr-${L.k}-heldout`;
    if (onlyIds && !onlyIds.includes(id)) continue;
    const files = allFiles().filter((f) => L.re.test(f));
    const atlas = takeDocs(`cd-${L.k}`, files, (f) => codeText(readText(f), newStats()));      // exactly what the atlas pocket took
    const used = new Set(atlas.docKeys), usedHash = new Set([...used].map((i) => fileHash(files[i])));
    const left = [], dropped = { identicalToAtlasFile: 0, repeatedLeftover: 0 }, seen = new Set();
    files.forEach((f, i) => { if (used.has(i)) return; const h = fileHash(f); if (usedHash.has(h)) { dropped.identicalToAtlasFile++; return; } if (seen.has(h)) { dropped.repeatedLeftover++; return; } seen.add(h); left.push(f); });
    const per = new Map(), st = newStats();
    const r = takeDocs(id, left, (f, i) => { const s = newStats(); const u = codeText(readText(f), s); per.set(i, s); return u; });
    if (!r.units.length) continue;
    for (const i of r.docKeys) for (const k of Object.keys(st)) st[k] += per.get(i)[k];
    const p = makePocket({ id, register: "diagram", language: `x-${L.k.split("-")[0]}`, script: "latn", units: r.units, docOf: r.docOf, meta: {
      tokenisation: "XML read as code (loaders/_cd_util.mjs codeText, the rule of cd-bpmn-*): runs of letters/marks/digits/underscore lowercased NFC (tag names, attribute names and values, labels, hex ids); numeric-initial tokens dropped, tokens > 64 characters dropped; unit = physical line",
      docDef: "one file = one document; leftover files (not taken by the atlas pocket), whole files in sha256(id:fileIndex) order, cap 300000 tokens", source: `${UB}/{train,dev,test}/*.txt (${L.label}), the ${left.length} files the atlas pocket cd-${L.k} did not take`,
      notes: `held-out documents of the cd-${L.k} corpus: ${files.length} lineage files, ${atlas.docKeys.length} taken by the atlas, ${left.length} unique leftover candidates (dropped ${JSON.stringify(dropped)}), ${r.docKeys.length} in this pocket; same exporters/models as the atlas pocket, so NOT independent worlds; counters ${JSON.stringify(st)}`,
      atlasKin: `cd-${L.k}`, atlasDocsTaken: atlas.docKeys.length } });
    p.group = "sib"; out.push(p);
  }
  return out;
}
