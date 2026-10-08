// greek-read.mjs — READ HOMER IN GREEK through the recovered seam (greek.mjs).
// The pro-drop seam: confirmed verbs from the Greek POS prior; the article is the
// case probe; clauses read subject/object off morphology. No word lists, no model.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekBeings, greekClauses, prodropClauses, nominalClass, caseOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);

const FILE = process.argv[2] || "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt";
const raw = fs.readFileSync(FILE, "utf8");
const body = raw.replace(/^---[\s\S]*?\n---\n/, "");
const CHARS = Number(process.argv[3] || 40000);

// priors from the ONE home
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));
console.log(`priors: pos-grc (${Object.keys(posPrior.forms ?? posPrior).length} forms, giver ${posPrior.provenance?.giver ?? "?"}) · case-marking-grc (${Object.keys(casePrior.nominalEndings ?? {}).length} nominal endings)`);

const text = body.slice(0, CHARS);
const verbs = confirmedVerbSet(posPrior);
console.log(`verbs confirmed by the Greek POS prior (VERB+AUX share > floor): ${verbs.size}`);
const beings = greekBeings(text, posPrior, { minOccurrences: 2 });
console.log(`beings: ${beings.length}  ·  ${beings.slice(0, 12).map((b) => b.stem).join(", ")}`);

// sentences ~ clause boundaries
const sents = text.split(/(?<=[.;—])/g);
const clauses = [];
for (const s of sents) if (s.trim().length > 3) {
  for (const c of greekClauses(s.trim(), verbs, posPrior, casePrior, { beings, articleMode: "soft", articleWindow: 1, minShare: 0.6, minCount: 20 })) clauses.push({ ...c, sent: s.trim().slice(0, 90) });
}
console.log(`\n═══ THE ILIAD (Greek) — first ${CHARS} chars — ${clauses.length} clauses read ═══`);
const face = (x) => { if (!x) return ""; let s = typeof x === "string" ? String(x) : String(x.head ?? x.surface ?? x.text ?? x.ref ?? JSON.stringify(x)); return s ? s[0].toUpperCase() + s.slice(1) : ""; };
for (const c of clauses.slice(0, 60)) {
  const verb = String(c.verb ?? "—");
  const subj = c.subject ? face(c.subject) : "(pro-drop)";
  const obj = c.object ? face(c.object) : "—";
  console.log(`  ${subj.padEnd(14)} ${verb.padEnd(14)} ${obj}   «${c.sent.trim().slice(0, 70)}»`);
}