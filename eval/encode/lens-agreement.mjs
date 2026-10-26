// eval/encode/lens-agreement.mjs — the encode leg against the 11 hand lenses: per language, does the codec say the fact (frame and value
// verbatim, one copula word) and does its copula agree with the lens's template? Pointed-at codecs count only where held on this machine.
import { encodeCopula, udGrammar } from "../../native/organs/encode.js";
import { FACT_LENSES } from "../../native/adapters/text/fact-lenses.js";
import fs from "node:fs";
const W = { eng: ["president", "France"], spa: ["presidente", "Francia"], fra: ["président", "France"], deu: ["Präsident", "Frankreich"], ita: ["presidente", "Francia"], por: ["presidente", "França"], rus: ["президент", "Франции"], arb: ["رئيس", "فرنسا"], jpn: ["大統領", "フランス"], hin: ["राष्ट्रपति", "फ़्रांस"], swa: ["rais", "Ufaransa"] };
const rows = [];
for (const [lang, L] of Object.entries(FACT_LENSES)) {
  const [h, j] = W[lang]; const frame = L.frame(h, j), value = "Emmanuel Macron";
  const r = udGrammar(lang) ? await encodeCopula({ frame, value, language: lang }) : { text: null, gaps: [{ gap: "no_codec" }] };
  const template = L.value("26 October 2026", frame, value);
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rest = r.text ? r.text.replace(new RegExp(esc(frame), "iu"), " ").replace(value, " ").trim().split(/\s+/).filter(Boolean) : [];
  rows.push({ lang, frame, encoded: r.text, gaps: r.gaps.map((g) => g.gap), template, copula: rest.join(" ") || null, agrees: rest.length === 1 ? template.split(/[\s,.。।]+/).includes(rest[0]) : rest.length === 0 && r.text ? "nominal" : null });
}
for (const r of rows) console.log([r.lang, r.agrees, r.copula, r.gaps.join(","), r.encoded, "| lens:", r.template].join("  "));
fs.writeFileSync(new URL("./lens-agreement-RESULT.json", import.meta.url), JSON.stringify({ ranAt: new Date().toISOString(), rows }, null, 1) + "\n");
