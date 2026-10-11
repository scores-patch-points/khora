// scene/read-udhr-batch.mjs — READ ALL FROM SCRATCH, STARTING WITH UDHR.
//
//   node eval/the-fold/scene/read-udhr-batch.mjs [--dir <UDHR dir>] [--out-dir <scene>]
//
// The old EOTs and prior readings are quarantined (2026-10-11). This driver
// RE-READS the corpus from the raw sources, beginning with the Universal
// Declaration of Human Rights — 516 translations of ONE document, the natural
// ground for the cross-translation identity rules (the same rights/holders in
// many languages are the meta-node's home). Each translation read is written
// as a fresh `eot-udhr-<code>.json`, which `build-corpus-eot.mjs` then folds
// into the single corpus EOT (the weft).
//
// Which languages we can read TODAY is gated by the received/induced priors:
//   params (one reader, every language): fra ita nld spa tur
//   hand seams (the measured per-language readers): eng rus lat san
// A language with no prior is a TYPED GAP (listed), never a guessed read.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readByParams } from "./reader-params.mjs";
import { readEnglish } from "./reader-en.mjs";
import { readRussian } from "./reader-rus.mjs";
import { readLatin } from "./reader-lat.mjs";
import { readSpanish } from "./reader-spa.mjs";
import { readGerman } from "./reader-deu.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const bench = (key, lang, file) => `${key}:${lang}`;

export const UDHR_BATCH_SCHEMA = "ReadUdhBatch@1";

// Every UDHR translation we can read: a params.lang (parameter seam, incl. the
// 2026-10-11 induced batch) or a hand reader. A code with no entry is a typed gap.
export const ROUTES = {
  // parameter seam (existing + prior-mapped)
  fra: { kind: "params", lang: "fra" }, ita: { kind: "params", lang: "ita" },
  nld: { kind: "params", lang: "nld" }, tur: { kind: "params", lang: "tur" },
  arb: { kind: "params", lang: "ara" },
  // induced 2026-10-11 (build-params.mjs, disclosed sparse: tagged verbs 0–5)
  swe: { kind: "params", lang: "swe" }, dan: { kind: "params", lang: "dan" },
  fin: { kind: "params", lang: "fin" }, hun: { kind: "params", lang: "hun" },
  pol: { kind: "params", lang: "pol" }, ces: { kind: "params", lang: "ces" },
  hrv: { kind: "params", lang: "hrv" }, srp_latn: { kind: "params", lang: "srp_latn" },
  slk: { kind: "params", lang: "slk" }, slv: { kind: "params", lang: "slv" },
  est: { kind: "params", lang: "est" }, lav: { kind: "params", lang: "lav" },
  lit: { kind: "params", lang: "lit" }, cat: { kind: "params", lang: "cat" },
  ind: { kind: "params", lang: "ind" }, afr: { kind: "params", lang: "afr" },
  ell_monotonic: { kind: "params", lang: "ell_monotonic" }, ukr: { kind: "params", lang: "ukr" },
  heb: { kind: "params", lang: "heb" }, jpn: { kind: "params", lang: "jpn" },
  kor: { kind: "params", lang: "kor" }, cmn_hans: { kind: "params", lang: "cmn_hans" },
  // hand readers (the measured per-language seams)
  eng: { kind: "readEnglish" }, rus: { kind: "readRussian" },
  lat: { kind: "readLatin" }, spa: { kind: "readSpanish" },
  deu_1996: { kind: "readGerman" },
};

/** One UDHR translation → its EOT. Returns null for an unreadable / gap code. */
export async function readUdhTranslation(code, file) {
  const route = ROUTES[code];
  if (!route) return null;
  switch (route.kind) {
    case "params": return (await readByParams({ lang: route.lang, file })).eot;
    case "readEnglish": return (await readEnglish({ file })).eot;
    case "readRussian": return (await readRussian({ file })).eot;
    case "readLatin": return (await readLatin({ file })).eot;
    case "readSpanish": return (await readSpanish({ file })).eot;
    case "readGerman": return (await readGerman({ file })).eot;
    default: return null;
  }
}

async function main() {
  const dir = path.resolve(HERE, "udhr-src");
  const outDir = path.resolve(HERE);
  const files = fs.readdirSync(dir)
    .filter((f) => /^udhr-[a-z]{2,4}(_[a-z0-9]+)?\.txt$/.test(f))
    .sort();
  const byCode = new Map();
  for (const f of files) {
    const m = /^udhr-([a-z0-9_]+)\.txt$/.exec(f);
    if (m) byCode.set(m[1], path.join(dir, f));
  }
  const targets = Object.keys(ROUTES).filter((l) => byCode.has(l));
  const gaps = [...byCode.keys()].filter((l) => !ROUTES[l]);
  console.log(`UDHR batch — ${targets.length} readable of ${byCode.size} present; ${gaps.length} differ: ${gaps.slice(0, 40).join(" ")}`);
  const reads = [];
  for (const lang of targets) {
    const file = byCode.get(lang);
    const out = path.join(outDir, `eot-udhr-${lang}.json`);
    if (fs.existsSync(out)) { console.log(`  ${lang.padEnd(4)} (already read — resume)`); continue; }
    const t0 = Date.now();
    try {
      const eot = await readUdhTranslation(lang, file);
      if (!eot) throw new Error("no read");
      const out = path.join(outDir, `eot-udhr-${lang}.json`);
      fs.writeFileSync(out, JSON.stringify(eot, null, 2));
      reads.push({ lang, clauses: eot.counts?.clauses ?? 0, referents: eot.counts?.referents ?? 0, ms: Date.now() - t0, out: path.basename(out) });
      console.log(`  ${lang.padEnd(4)} ${String(eot.counts?.clauses ?? 0).padStart(5)} clauses · ${String(eot.counts?.referents ?? 0).padStart(4)} referents · ${Date.now() - t0}ms → ${path.basename(out)}`);
    } catch (e) {
      console.error(`  ${lang} ERR: ${e.message}`);
    }
  }
  console.log(`read ${reads.length}/${targets.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // DEFAULT: point `udhr-src` at the corpus's un-udhr dir if it is empty.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const srcDefault = "/Users/mlacy/Documents/3.0/Zenodotus/06-government-legal/un-udhr";
  const local = path.join(here, "udhr-src");
  if (!fs.existsSync(local)) fs.symlinkSync(srcDefault, local);
  await main();
}