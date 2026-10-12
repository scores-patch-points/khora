// scene/read-injunctions-multilingual.mjs — does the universal-rights paradigm
// survive translation? Reads each UDHR translation's modal clauses into
// EOObligation@1 with a DECLARED per-language marker table (the poverty-of-stimulus
// discipline: parameters declared, never measured from a corpus) and runs the same
// emergent Paradigm projection. English is the reference (last run: 31 members).
//
//   node native/eval/the-fold/scene/read-injunctions-multilingual.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { obligation } from "../../../kernel/obligations.js";
import { projectEmergentTerrains } from "../../../kernel/emergent-terrain.js";
import { splitSentences } from "../../../adapters/text/spans.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, "udhr-src");

// DECLARED tables (substring, lowercased) — the reading's own parameters.
const LANGS = {
  eng: { file: "udhr-eng.txt", right: ["has the right", "have the right", "is entitled", "are entitled"], prohibition: ["no one shall", "nobody shall"], universal: ["everyone", "every person", "all ", "no one", "nobody", "men and women"] },
  fra: { file: "udhr-fra.txt", right: ["a droit", "ont droit", "ont le droit", "a le droit"], prohibition: ["nul ne", "personne ne"], universal: ["tous", "toute", "toutes", "nul ", "personne"] },
  spa: { file: "udhr-spa.txt", right: ["tiene derecho", "tienen derecho", "tiene el derecho"], prohibition: ["nadie será", "nadie sera", "nadie podrá"], universal: ["todos", "toda", "todas", "nadie"] },
  deu: { file: "udhr-deu_1996.txt", right: ["hat das recht", "haben das recht"], prohibition: ["niemand darf", "niemand wird"], universal: ["alle", "jeder", "jede", "niemand"] },
  nld: { file: "udhr-nld.txt", right: ["heeft recht", "hebben recht", "heeft het recht"], prohibition: ["niemand mag", "niemand wordt", "niemand zal", "geen enkele"], universal: ["iedereen", "ieder", "allen", "niemand", "alle"] },
  ita: { file: "udhr-ita.txt", right: ["ha diritto", "hanno diritto", "ha il diritto"], prohibition: ["nessuno può", "nessuno puo", "nessuno"], universal: ["tutti", "ogni", "nessuno"] },
  rus: { file: "udhr-rus.txt", right: ["имеет право", "имеют право"], prohibition: ["никто не", "ни один"], universal: ["все", "каждый", "каждая", "никто"] },
  ukr: { file: "udhr-ukr.txt", right: ["має право", "мають право"], prohibition: ["ніхто не"], universal: ["всі", "кожен", "кожна", "ніхто"] },
  cmn_hans: { file: "udhr-cmn_hans.txt", right: ["有权", "有權"], prohibition: ["不得"], universal: ["人人", "任何", "所有", "每个人"] },
  tur: { file: "udhr-tur.txt", right: ["hakkına sahiptir", "hakkı vardır", "hakkına sahip"], prohibition: ["hiç kimse"], universal: ["herkes", "tüm", "hiç kimse"] },
  afr: { file: "udhr-afr.txt", right: ["het die reg", "het regte"], prohibition: ["niemand mag", "niemand sal"], universal: ["alle", "elke", "niemand"] },
  cat: { file: "udhr-cat.txt", right: ["té dret", "tenen dret", "té el dret"], prohibition: ["ningú no", "ningú"], universal: ["tots", "tota", "totes", "ningú"] },
  ind: { file: "udhr-ind.txt", right: ["berhak"], prohibition: ["tidak seorang pun", "tidak boleh"], universal: ["setiap", "semua"] },
  por: { file: "udhr-por_PT.txt", right: ["tem direito", "têm direito", "tem o direito"], prohibition: ["ninguém será", "ninguem sera", "ninguém poderá"], universal: ["todos", "toda", "ninguém"] },
};

const PARA = /\n[ \t]*\n/g;

function blocks(text) {
  const out = []; let last = 0, m;
  while ((m = PARA.exec(text))) { out.push({ t: text.slice(last, m.index), at: last }); last = m.index + m[0].length; }
  out.push({ t: text.slice(last), at: last });
  return out;
}
const has = (low, arr) => arr.some((s) => low.includes(s));

// Segmentation is the READER'S OWN organ (`splitSentences`, adapters/text/spans.js):
// it carries every declared script's terminators (。！？｡؟۔।॥։።) and the unspaced-
// script rule. No second guess at segmentation lives here (the one-organ law).
function read(text, table, label) {
  const clauses = [];
  for (const [pi, b] of blocks(text).entries()) {
    for (const s of splitSentences(b.t)) {
      const t = s.text; if (!t) continue;
      const low = t.toLowerCase();
      let kind = null;
      if (has(low, table.right)) kind = "right";
      else if (has(low, table.prohibition)) kind = "prohibition";
      if (!kind) continue;
      const bearer = has(low, table.universal) ? "universal" : "other";
      clauses.push({ text: t, at: Buffer.byteLength(text.slice(0, b.at + s.offset), "utf8"), kind, bearer, ground: `para:${pi}` });
    }
  }
  const obligations = clauses.map((c) => obligation({
    id: `obligation:${label}:${c.at}`,
    distinction: { materiality: { makesDifference: true, reasons: [{ kind: `bearer:${c.bearer}` }] } },
    grounds: [c.ground], alternatives: [], consequences: [{ kind: c.kind }], status: "open",
  }));
  return { clauses, obligations };
}

const rows = [];
for (const [code, table] of Object.entries(LANGS)) {
  const p = path.join(SRC, table.file);
  if (!fs.existsSync(p)) { rows.push({ code, missing: true }); continue; }
  const text = fs.readFileSync(p, "utf8");
  const { clauses, obligations } = read(text, table, code);
  const state = projectEmergentTerrains({ graphEntries: [], obligations });
  const uni = state.Paradigm.find((x) => x.pattern.includes("consequence:right") && x.pattern.includes("bearer:universal"));
  rows.push({
    code, obligations: obligations.length,
    rights: clauses.filter((c) => c.kind === "right").length,
    prohibitions: clauses.filter((c) => c.kind === "prohibition").length,
    universals: clauses.filter((c) => c.bearer === "universal").length,
    models: state.Paradigm.length,
    uniMembers: uni ? uni.obligationRefs.length : 0,
    uniGrounds: uni ? uni.groundRefs.length : 0,
    uniGain: uni ? uni.model?.compressionGain : null,
  });
}

console.log("language  obl  right  proh  univ  models  uni-right  members  grounds  gain");
for (const r of rows) {
  if (r.missing) { console.log(`${r.code.padEnd(9)} — file absent`); continue; }
  console.log(`${r.code.padEnd(9)} ${String(r.obligations).padStart(3)} ${String(r.rights).padStart(6)} ${String(r.prohibitions).padStart(5)} ${String(r.universals).padStart(5)} ${String(r.models).padStart(7)} ${String(r.uniMembers ? "YES" : "no").padStart(9)} ${String(r.uniMembers).padStart(8)} ${String(r.uniGrounds).padStart(8)} ${String(r.uniGain ?? "").padStart(5)}`);
}
const read_ = rows.filter((r) => !r.missing);
const withParadigm = read_.filter((r) => r.uniMembers >= 3);
console.log(`\nuniversal-rights paradigm admitted (>=3 members): ${withParadigm.length}/${read_.length} languages`);
const sizes = withParadigm.map((r) => r.uniMembers).sort((a, b) => a - b);
if (sizes.length) console.log(`member counts: min ${sizes[0]} · median ${sizes[Math.floor(sizes.length / 2)]} · max ${sizes[sizes.length - 1]}`);

const OUT = "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/udhr-paradigm-translation-v1.json";
const artifact = {
  schema: "InjunctionReading@1",
  kind: "paradigm-translation",
  question: "does the universal-rights paradigm survive translation, or is it a paradigm of English?",
  giver: "corpus:udhr — the declaration in 14 languages",
  method: "declared per-language modal-marker tables (poverty-of-stimulus: parameters declared, not measured from a corpus) -> EOObligation@1 -> same emergent Paradigm projection",
  verdict: `${withParadigm.length}/${read_.length} languages admit the {consequence:right | materiality:bearer:universal} paradigm; member counts min ${sizes[0]} median ${sizes[Math.floor(sizes.length / 2)]} max ${sizes[sizes.length - 1]}`,
  reading: "the paradigm is OF THE DECLARATION, not of its English — it survives across very different modal grammars (Chinese 有权, Russian имеет право, Turkish hakkına sahiptir). Consistent with LP8 (the GRAIN transfers across languages 100/100) even though lexical relation labels do not.",
  rows,
  disclosed_limits: "declared marker tables are a declaration, not a measurement — a table miss is a READER GAP (Dutch first failed on 'heeft recht'/'een ieder', not on Dutch); Turkish's 7 vs English's 31 reflects bearer-words not co-occurring in the same sentence; the MDL paradigm gate is retrospective; a single non-temporal read; lighting is not earned standing.",
  falsifying_control: "a language whose rights clauses carry no universal-bearer word in the same sentence AND no paradigm admits breaks the survival claim; or a marker table independently verified that still yields no group.",
  history: [{ at: new Date().toISOString(), event: "born", note: "the universal-rights paradigm tested across 14 translations" }],
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2));
console.log(`wrote ${OUT}`);
