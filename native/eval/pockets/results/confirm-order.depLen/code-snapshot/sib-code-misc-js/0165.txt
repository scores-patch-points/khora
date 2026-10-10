// organs/grounded-composition.mjs — the box-fill (2026-10-01).
//
// The path to a LONG, GROUNDED work with a small mouth: the VOID declares many
// claims, each with a citation phrase; the BOX grounds each claim against a
// clean source index (findClean → the verbatim sentence at its byte address) or
// CENSORS it; the mouth draws only the connective residue between claims. The
// composition reaches length by count of verified claims, never by one long
// draw. The hard grounding rule (GL-BD-18) is the law: replace what is
// verified, censor what is not — no ungrounded claim survives.
//
// PURE (node builtins). Selftest:
//   node --input-type=module -e "import('./organs/grounded-composition.mjs').then(m=>m.selftest())"
import { findClean } from "./source-index.mjs";

export const COMP_SCHEMA = "GroundedComposition@1";

/** Compose a grounded work from the VOID. `sections`: [{ heading, residue,
 *  claims: [phrase...] }]. Each claim is grounded against the clean indices or
 *  censored; the residue is the mouth's drawn prose. Returns the composed
 *  document and the grounding report (verified / censored, with byte
 *  addresses). */
export function composeGrounded({ title = null, sections = [], indices = {} } = {}) {
  const out = [];
  const report = { verified: [], censored: [] };
  for (const sec of sections) {
    const parts = [];
    if (sec.heading) parts.push(`\n\n## ${sec.heading}`);
    if (sec.residue) parts.push(`\n\n${sec.residue}`);
    for (const phrase of sec.claims ?? []) {
      let hit = null;
      for (const [label, idx] of Object.entries(indices)) {
        const f = findClean(idx, phrase);
        if (f.ok) { hit = { ...f, label }; break; }
      }
      if (hit) {
        report.verified.push({ phrase, sentence: hit.sentence, source: hit.label, abs: hit.abs, len: hit.len });
        parts.push(`\n\n“${hit.sentence}” [${hit.label}@${hit.abs}]`);
      } else {
        report.censored.push({ phrase });
        parts.push(`\n\n⟦censored: unverifiable claim⟧`);
      }
    }
    out.push(parts.join(""));
  }
  const text = (title ? `# ${title}` : "") + out.join("");
  return { schema: COMP_SCHEMA, ok: true, text, ...report };
}

export async function selftest() {
  const t = (n, c) => { if (!c) { console.error("FAIL", n); process.exitCode = 1; } else console.log("ok", n); };
  const { indexSource } = await import("./source-index.mjs");
  const REP = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
  const idx = indexSource(REP);
  const r = composeGrounded({
    title: "T", sections: [
      { heading: "H1", residue: "The mouth's residue.", claims: ["The waxen tablet of the memory", "a claim that exists nowhere"] },
    ],
    indices: { republic: idx },
  });
  t("a verifiable claim is composed with its byte address", r.verified.length === 1 && /republic@\d+/.test(r.text));
  t("an unverifiable claim is censored, never left ungrounded", r.censored.length === 1 && /censored/.test(r.text));
}