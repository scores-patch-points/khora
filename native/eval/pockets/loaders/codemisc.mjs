// loaders/codemisc.mjs — loader group "cd": programming-language corpora, notations (chess SAN, SMILES, IPA, protein/codon sequences, LilyPond, ABC, BPMN/DOT/Mermaid), and other
// non-natural-language text worlds. Contract: async load(onlyIds = null) -> Pocket[] (lazy: only the ids asked for are built). Helper modules start with "_" so run-atlas ignores them.
import { codeCorpusEntries } from "./_cd_codecorpus.mjs";
import { ethosEntries } from "./_cd_ethos.mjs";
import { notation1Entries } from "./_cd_notation1.mjs";
import { notation2Entries } from "./_cd_notation2.mjs";
import { notation3Entries } from "./_cd_notation3.mjs";

export const ENTRIES = () => [...ethosEntries(), ...codeCorpusEntries(), ...notation1Entries(), ...notation2Entries(), ...notation3Entries()];
export const ids = () => ENTRIES().map((e) => e.id);

export async function load(onlyIds = null) {
  const want = onlyIds ? new Set(onlyIds) : null, out = [];
  for (const e of ENTRIES()) {
    if (want && !want.has(e.id)) continue;
    try { const p = await e.build(); if (p) out.push(p); } catch (err) { console.error(`codemisc: pocket ${e.id} failed to build: ${String(err.message).slice(0, 200)}`); }
  }
  return out;
}
