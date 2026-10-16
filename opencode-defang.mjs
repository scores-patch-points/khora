// opencode-defang.mjs — THE FIREWALL'S STRIPPER, shared by BOTH stores.
//
// The EOT log (opencode-eot.mjs) and the worknotes medium (opencode-worknotes.mjs) both carry model
// text to OTHER agents. The firewall is only a firewall if the same strip runs on every store: a
// forged marker must not survive on one path while it is neutralized on the other. So the strip lives
// once here and both import it.
//
// Defang the markers a model could forge to look mechanical — its own words passing for a snip, an
// address, a fold section, or a log id. VISIBLE, but no longer parseable: nothing is silently dropped.
export function neutralize(text) {
  return String(text ?? "")
    .replace(/⟨/g, "‹").replace(/⟩/g, "›").replace(/⟦/g, "‹").replace(/⟧/g, "›")
    .replace(/\[\[\s*snip:/gi, "[ snip:")
    .replace(/<\s*\/?\s*fold-/gi, (m) => m.replace(/fold-/i, "fold_"))
    .replace(/\b(evt|src)_([0-9a-f]{20})\b/g, "$1-$2");
}
