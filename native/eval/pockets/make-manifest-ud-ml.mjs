// eval/pockets/make-manifest-ud-ml.mjs — build every pocket of the "ud" and "ml" loaders ONE AT A TIME (bounded memory), validate each, and write
//   loaders/ud.manifest.json and loaders/ml.manifest.json (pockets built, pockets dropped as thin, static skips, a sha256 of every pocket's content for the determinism check).
//   node make-manifest-ud-ml.mjs [ud|ml] [--only id1,id2] [--out-suffix .check]      (run it with nohup: the machine is loaded)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, validate } from "./lib/pocket.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), grp = argv.find((a) => a === "ud" || a === "ml");
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const only = opt("--only", null)?.split(","), suffix = opt("--out-suffix", "");
const NOTES = {
  ud: ["Reader: eval/law/impact.mjs readConlluStream refuses test.conllu on purpose (held-out TEST for its pre-registered smoke), so loaders/ud.mjs carries its own reader with the same semantics and DOES read test.conllu as the atlas task asked: the UD test splits are therefore consumed by the atlas (UD_SPLITS=dev gives dev-only pockets).",
    "53 stems exist under /private/tmp/claude-501/ud-eval, not 25: every stem with >= 20,000 tokens is a pocket; meta.inSTEMS25 marks the 25 of name-company.mjs.",
    "ud-cmn and ud-cmn-hans are the same text in Traditional and Simplified script: not independent pockets.",
    "Tokens are CoNLL-U syntactic words (multiword-token ranges split: es del -> de el, ar/he clitics); meta.mwtTokenShare gives the share, UD_GRAIN=surface switches to orthographic words. meta.meanLettersPerToken is a grain proxy (lzh/cmn/jpn are near 1-2).",
    "The treebanks are the dev+test files only (<= ~100k tokens each), so no UD pocket reaches the 300,000-token cap."],
  ml: ["Grain: scripts without spaces (Literary Chinese, classical/modern Japanese) have NO source word segmentation here, so tokens are NON-overlapping 2-character chunks per clause (ML_CJK_GRAIN=unigram for single characters); meta.tokenisation says so on every pocket; never compare these with word-grain pockets silently.",
    "Sources over the 300,000-token cap keep whole 100-unit blocks in sha256(id:blockIndex) order; cap.tokensBefore is null for those because tokenising is lazy (docsBefore is exact).",
    "gutenberg-non-en is mislabelled (ethos CORPUS-INTEGRITY-FINDING): content was read; only verified non-English files are loaded, the English books in it are skipped (see staticSkips).",
    "Drama pockets (ml-grc-tragedy, ml-grc-comedy) keep residual speaker-name tokens where the scrape puts them inline (Aeschylus files); speaker lines are dropped only where a layout rule finds them. Do not read name statistics in those pockets as natural-text names.",
    "Parallel-classics pockets of the same work (ml-pc-<work>-<lang>) share content across languages and are not independent in content; ml-djk-ndyuka and ml-eng-bible-opus are parallel; ml-en-* are English translations of texts that also exist as originals here.",
    "Machine-OCR pockets (ml-deu-ranke, ml-en-hippocrates, ml-en-ranke, ml-en-nirvana, ml-lat-copernicus) carry OCR noise. Classical Arabic pockets have sparse punctuation: unit lengths are long (see meta.unitLen).",
    "ml-grc-hellenistic-hist is labelled by content: the file is declared Herodotus but reads as Polybius-type Hellenistic history. Titles elsewhere are the files' own front matter and were not verified."]
};
const mod = await import(`./loaders/${grp}.mjs`);
const rows = [], skipped = [], t0 = process.hrtime.bigint(); let errors = 0;
for (const id of mod.IDS) {
  if (only && !only.includes(id)) continue;
  const c0 = process.cpuUsage(), w0 = process.hrtime.bigint(), r = await mod.loadWithReport([id]);
  const cpuMs = Math.round((process.cpuUsage(c0).user + process.cpuUsage(c0).system) / 1000), wallMs = Math.round(Number(process.hrtime.bigint() - w0) / 1e6);
  for (const s of r.skipped) { skipped.push(s); if (/error/.test(s.reason)) errors++; }
  for (let k = 0; k < r.pockets.length; k++) {
    const p = r.pockets[k], v = validate(p);
    rows.push({ ...r.rows[k], validate: v.thin ? "THIN" : "ok", overCap: v.overCap, contentSha256: sha256(JSON.stringify({ u: p.units, d: p.docOf })), loadCpuMs: cpuMs, loadWallMs: wallMs, meta: undefined,
      extra: { unitLen: p.meta.unitLen ?? null, grainCharsPerToken: p.meta.grainCharsPerToken ?? null, meanLettersPerToken: p.meta.meanLettersPerToken ?? null, mwtTokenShare: p.meta.mwtTokenShare ?? null, inSTEMS25: p.meta.inSTEMS25 ?? null } });
  }
  console.error(`${id}: ${r.pockets.length ? "ok " + r.rows[0].tokens : "skipped " + JSON.stringify(r.skipped[0]).slice(0, 120)} cpu ${cpuMs} ms wall ${wallMs} ms`);
}
const out = { group: grp, generatedBy: "eval/pockets/make-manifest-ud-ml.mjs", partial: !!only, env: { UD_SPLITS: process.env.UD_SPLITS ?? null, UD_GRAIN: process.env.UD_GRAIN ?? null, ML_CJK_GRAIN: process.env.ML_CJK_GRAIN ?? null },
  counts: { pockets: rows.length, tokens: rows.reduce((a, r) => a + r.tokens, 0), droppedThinOrFailed: skipped.length, errors }, notes: NOTES[grp], pockets: rows, skippedAtBuild: skipped, staticSkips: mod.STATIC_SKIPS ?? [],
  registers: Object.fromEntries([...new Set(rows.map((r) => r.register))].sort().map((k) => [k, rows.filter((r) => r.register === k).length])), scripts: Object.fromEntries([...new Set(rows.map((r) => r.script))].sort().map((k) => [k, rows.filter((r) => r.script === k).length])) };
fs.writeFileSync(path.join(HERE, "loaders", `${grp}.manifest${suffix}.json`), JSON.stringify(out, null, 1));
console.error(`done ${grp}: ${rows.length} pockets, ${skipped.length} skipped, ${errors} errors, ${(Number(process.hrtime.bigint() - t0) / 1e9).toFixed(0)} s wall`);
