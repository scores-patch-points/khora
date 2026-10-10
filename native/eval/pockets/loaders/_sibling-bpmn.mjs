// loaders/_sibling-bpmn.mjs — NEW diagram pockets for the sibling replication of fig.introRight: HELD-OUT documents of the BPMN lineages of /private/tmp/claude-501/notation/uml_bpmn/corpus.
// The atlas pockets cd-bpmn-miwg / -kogito / -activiti took whole files in sha256(id:fileIndex) order up to the 300k-token cap; the files it did NOT take (1,042,168 / 161,917 / 68,568 tokens left over) are the material here.
// The atlas selection is re-derived here with the atlas's own takeDocs (same ids, same file lists, same tokeniser) so that the two sets are disjoint by construction; leftover files byte-identical to a file the atlas took are dropped (counted).
// These are held-out DOCUMENTS of the same exporter families, not a new diagram world: they test sampling stability of the law, not generality. The three other diagram pockets (cd-dot, cd-mermaid, cd-sbgn) and cd-bpmn-camunda were read whole by the atlas, nothing is left of them.
// svg/bpmn/drawio/dot files in the repositories eoreader7, heimdall and the-fold total 2,171 tokens (159 unique files), far under the 20,000-token floor: no pocket.
import fs from "node:fs";
import { codeText, newStats, takeDocs, sortedFiles, readText, makePocket } from "./_cd_util.mjs";
import { fileHash } from "./_sibling-common.mjs";

const UB = "/private/tmp/claude-501/notation/uml_bpmn/corpus";
const LINEAGES = [
  { k: "bpmn-miwg", re: /\/bpmn-miwg-test-suite--/, label: "BPMN 2.0 XML, BPMN MIWG test suite (many vendors' exporters)" },
  { k: "bpmn-kogito", re: /\/kogito-(runtimes|examples)--/, label: "BPMN 2.0 XML from Kogito (jBPM lineage)" },
  { k: "bpmn-activiti", re: /\/(Activiti|flowable-engine)--/, label: "BPMN 2.0 XML from Activiti and Flowable" },
];
export const IDS = LINEAGES.map((l) => `sib-${l.k}-heldout`);
let _all = null;
const allFiles = () => (_all ??= ["train", "dev", "test"].flatMap((s) => sortedFiles(`${UB}/${s}`, (f) => f.endsWith(".txt"))));

export async function load(onlyIds = null) {
  const out = [];
  if (!fs.existsSync(UB)) return out;
  for (const L of LINEAGES) {
    const id = `sib-${L.k}-heldout`;
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
      notes: `held-out documents of the cd-${L.k} corpus: ${files.length} lineage files, ${atlas.docKeys.length} taken by the atlas, ${left.length} unique leftover candidates (dropped ${JSON.stringify(dropped)}), ${r.docKeys.length} in this pocket; same exporters/models as the atlas pocket, so NOT independent worlds; counters ${JSON.stringify(st)}` } });
    p.group = "sib"; out.push(p);
  }
  return out;
}
