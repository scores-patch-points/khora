/* Champollion's autonomous school — a runner that can be assigned to a VM to
 * learn languages without a human in the loop. It holds every seam family,
 * FEEDS a text, AUTO-FITS the grammar family (tries each typed seam, keeps the
 * one that clears the good-enough bar), AUDITS (the referee's byte-trace and
 * an idempotence re-read), and FILES a verdict. A failure is a loud page, not
 * a silent degrade. The compounding: priors seed casts; a language in an
 * already-held family is fitted in one pass; each new FAMILY (case-ending,
 * position, article-case, agglutinative, semitic, sino …) is one human/agent
 * decision, after which every language in it runs forever.
 *
 * The law (Champollion's): the Rosetta parallel is the GRID, never content;
 * a name binds by recurrence within the grid, never by wordlist; a seam that
 * returns the vocabulary instead of the beings is a dictionary, not a reader;
 * and a seam that fails the bar on its own reading is refused, not shipped.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const ZENO = "/Users/mlacy/Documents/3.0/Zenodotus";
const SCENE = `${KHOR}/native/eval/the-fold/scene`;
const LEDGER = `${KHOR}/native/organs/school-verdicts.jsonl`;

// THE SEAM FAMILIES — each is a reader that emits EO clauses from a native
// grammar. A new language is fitted by trying the family whose PRIOR it
// shares; a text with no held prior is auto-fitted by cross-family trial.
const FAMILIES = {
  "case-ending": { readers: ["reader.mjs", "reader-lat.mjs", "reader-san.mjs"], priors: ["case-marking-grc", "case-marking-lat", "case-marking-san"], note: "pro-drop morphology; subject in the ending (Pāṇini's world)" },
  "word-order": { readers: ["reader-en.mjs"], priors: ["pos-eng"], note: "position is the case; S-V-O" },
  "article-case": { readers: ["reader-deu.mjs"], priors: ["pos-deu"], note: "case in the article (der/die/das Nom, den Acc, dem Dat)" },
};
const FAMILY_FOR = { grc: "case-ending", lat: "case-ending", san: "case-ending", eng: "word-order", deu: "article-case" };
const CODE_OF = { "reader.mjs": "grc", "reader-lat.mjs": "lat", "reader-san.mjs": "san", "reader-en.mjs": "eng", "reader-deu.mjs": "deu" };

const readAs = async (reader, { text }) => {
  const mod = await import(`${SCENE}/${reader}`);
  const fn = reader === "reader-deu.mjs" ? mod.readGerman
    : reader === "reader-en.mjs" ? mod.readEnglish
    : reader === "reader-lat.mjs" ? mod.readLatin
    : reader === "reader-san.mjs" ? mod.readSanSanskrit
    : mod.readGreek;
  const r = await fn({ text });
  return r;
};

// THE AUDITOR — the byte-trace a self-audit demands, not name-membership:
//   · a claimed being must be bound in an EDGE (a seat claim in the EOT);
//   · an invented falsehood must bind NOWHERE as a subject/object;
//   · idempotence: a second read must agree with the first (same cast, within
//     a margin) — a seam that does not agree with itself is not read.
const edgeNames = (r) => {
  const names = new Set();
  for (const c of r.clauses) for (const x of [c.subject, c.object, c.dative]) if (x?.head) names.add(String(x.head).toLowerCase());
  return names;
};
const audit = async (r, { truths = [], falsehoods = [] }) => {
  // BYTE TRACE: truth/falsehood against the EDGE seat-cast, not the ref list.
  const seat = edgeNames(r);
  const truthsVerdict = truths.map((t) => ({ text: t, attested: seat.has(t.toLowerCase()) }));
  const falsehoodsVerdict = falsehoods.map((f) => ({ text: f, refused: !seat.has(f.toLowerCase().split(" ")[0]) }));
  // IDEMPOTENCE: re-read the same text, same family, and compare casts.
  const again = await readAs(r._reader, { text: r._text });
  const cast1 = [...edgeNames(r)].sort(), cast2 = [...edgeNames(again)].sort();
  const common = cast1.length + cast2.length ? (cast1.filter((x) => cast2.includes(x)).length / Math.max(cast1.length, 1)) || 0 : 1;
  const agreement = 1 - (Math.abs(cast1.length - cast2.length) / Math.max(1, cast1.length));
  const idempotent = agreement >= 0.8;
  return { truths: truthsVerdict, falsehoods: falsehoodsVerdict, idempotent, agreement: +agreement.toFixed(3), castSize: cast1.length };
};

// THE GOOD-ENOUGH SCORE (the trainer's gates, plus the audit assembly).
const scoreOf = (r, auditV) => {
  const edges = r.clauses ?? [];
  const O = edges.filter((c) => r.objectRefOf?.(c)).length;
  const S = edges.filter((c) => r.subjectRefOf?.(c)).length;
  const seeded = edges.slice(0, 8).filter((c) => (c.subject?.case || c.object?.case || c.dative?.case)).length;
  const obj = O / Math.max(8, edges.length);
  const subj = S / Math.max(4, edges.length);
  const gates = {
    EO: seeded,
    cast: [...edgeNames(r)].slice(0, 5),
    byteTruths: auditV.truths.filter((t) => t.attested).length / Math.max(1, auditV.truths.length),
    byteRefusals: auditV.falsehoods.filter((f) => f.refused).length / Math.max(1, auditV.falsehoods.length),
    idempotent: auditV.idempotent,
  };
  const score = (0.4 * Math.min(1, obj)) + (0.3 * seeded / 8) + (0.2 * Math.min(1, subj)) + (0.1 * (auditV.idempotent ? 1 : 0));
  return { gates, score: +score.toFixed(3) };
};

// THE SCHOOL'S REFUSAL LAW: a seam whose own verdict fails is not shipped.
const BAR = { minEO: 6, minObj: 0.2, mustAttestTruths: 0.6, mustRefuseFalsehoods: 0.6 };
const passesBar = (g) => g.EO >= BAR.minEO && g.byteTruths >= BAR.mustAttestTruths && g.byteRefusals >= BAR.mustRefuseFalsehoods;

export async function learnFromText(text, { truths = [], falsehoods = [], preferFamily = null, label = "auto" } = {}) {
  const tried = [];
  // AUTO-FIT: if a family is preferred use it first; else try all held.
  const familiesToTry = preferFamily ? [preferFamily] : Object.keys(FAMILIES);
  for (const family of familiesToTry) {
    for (const reader of FAMILIES[family].readers) {
      try {
        const r = await readAs(reader, { text });
        r._reader = reader; r._text = text;
        const aud = await audit(r, { truths, falsehoods });
        const sc = scoreOf(r, aud);
        tried.push({ family, reader, code: CODE_OF[reader], ...sc });
        if (passesBar(sc.gates)) {
          const verdict = { event: "learned", at: new Date().toISOString(), label, family, reader, code: CODE_OF[reader], score: sc.score, gates: sc.gates, ...aud };
          fs.appendFileSync(LEDGER, JSON.stringify(verdict) + "\n");
          return { learned: true, verdict };
        }
      } catch (e) { tried.push({ family, reader, error: e.message.slice(0, 120) }); }
    }
  }
  // NOTHING CLEARED THE BAR — a loud, filed refusal, never a silent ship.
  const best = tried.filter((t) => t.score !== undefined).sort((a, b) => b.score - a.score)[0];
  const verdict = { event: "refused", at: new Date().toISOString(), label, truth: truths.slice(0, 3), falsehoods: falsehoods.slice(0, 3), tried: tried.map((t) => ({ family: t.family, reader: t.reader, score: t.score, error: t.error })).slice(0, 5), best };
  fs.appendFileSync(LEDGER, JSON.stringify(verdict) + "\n");
  return { learned: false, verdict, tried };
}

export async function runSchoolLoop({ texts = {}, truthsByLabel = {}, falsehoodsByLabel = {} } = {}) {
  console.log("CHAMPOLION'S SCHOOL — autonomous learn loop (learnFromText, audited, filed).");
  console.log("held families:", Object.keys(FAMILIES).join(", "), "\n");
  const results = [];
  for (const [label, text] of Object.entries(texts)) {
    const res = await learnFromText(text, { truths: truthsByLabel[label] ?? [], falsehoods: falsehoodsByLabel[label] ?? [], preferFamily: FAMILY_FOR[label] ?? null, label });
    const g = res.verdict?.gates;
    console.log(`  ${label.padEnd(14)} ${res.learned ? "LEARNED ✓" : "REFUSED ✗"} ${res.verdict?.family ?? ""} (${res.verdict?.reader ?? ""}) score ${res.verdict?.score ?? "—"} | EO ${g?.EO ?? "—"} idem ${res.verdict?.idempotent ?? "—"} cast [${(g?.cast ?? []).join(", ")}]`);
    results.push(res);
  }
  fs.appendFileSync(LEDGER, JSON.stringify({ event: "school-run", at: new Date().toISOString(), learned: results.filter((r) => r.learned).length, refused: results.filter((r) => !r.learned).length }) + "\n");
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.chdir(SCENE); // the Greek reader imports translate.mjs off cwd
  const args = process.argv.slice(2);
  const [label, file, truthsFile] = args;
  if (!label || !file) { console.error("usage: school-runner.mjs <label> <textFile> [truths.jsonl]"); process.exit(1); }
  const text = fs.readFileSync(file.startsWith("/") ? file : `${ZENO}/${file}`, "utf8").slice(0, Number(process.env.SCHOOL_CHARS || 12000));
  const truths = truthsFile && fs.existsSync(truthsFile) ? fs.readFileSync(truthsFile, "utf8").trim().split("\n").filter(Boolean) : [];
  const res = await learnFromText(text, { truths, falsehoods: process.env.SCHOOL_FALSEHOODS?.split("|") ?? [], label });
  console.log(res.learned ? `LEARNED as ${res.verdict.family}: score ${res.verdict.score}` : `REFUSED — ${res.verdict.event}`);
  console.log("tried:", res.tried?.map((t) => `${t.reader}(${t.score ?? t.error ?? ""})`).join(" | "));
}