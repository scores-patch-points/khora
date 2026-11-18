// scripts/lib/script-pure.mjs — lesson 6 made a function: priors must be script-pure.
//
// A treebank leaks foreign-script fragments and loanwords into a prior's forms
// (pos-srp 11,155 Latin forms; pos-rus 867 Latin X-forms; pos-jpn 700 Latin NOUN).
// Reading a language through a prior that carries ANOTHER script's forms lets that
// lexicon answer for the language. This scrubs a prior's FORM vocabulary down to
// the language's own script — universal: one function, every language.
export function scrubbedForms(forms, scriptRegex) {
  // presence test: keep a form if it contains AT LEAST ONE character of the target
  // script's letter class (removes fully-foreign-script forms; keeps compounds/
  // hyphens that are still the language's script). Dropping a hyphenated or
  // diacritic-stripped Latin form is over-scrubbing — full-match was over-strict.
  const re = new RegExp(String(scriptRegex).replace(/[+*]$/, ""));
  const out = {}; let scrubbed = 0;
  for (const [k, v] of Object.entries(forms ?? {})) {
    if (re.test(String(k).normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) out[k] = v; else scrubbed += 1;
  }
  return { forms: out, scrubbed, kept: Object.keys(out).length };
}