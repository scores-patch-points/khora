// hdr.mjs — sha256 of a script's PRE-REGISTRATION block (lines from the "═══ PRE-REGISTRATION" marker to the "═══ END OF PRE-REGISTRATION" marker) + fingerprints of the library files.
import fs from "node:fs";
import { createHash } from "node:crypto";
export function headerSha(url) {
  const lines = fs.readFileSync(new URL(url), "utf8").split("\n"), a = lines.findIndex((l) => l.startsWith("// ═══ PRE-REGISTRATION")), b = lines.findIndex((l) => l.startsWith("// ═══ END OF PRE-REGISTRATION"));
  if (a < 0 || b < 0) throw new Error("no pre-registration block"); return createHash("sha256").update(lines.slice(a, b + 1).join("\n")).digest("hex");
}
export const fp = (f) => createHash("sha256").update(fs.readFileSync(new URL(f, import.meta.url))).digest("hex").slice(0, 16);
export const CODE = () => Object.fromEntries(["common.mjs", "stats.mjs", "hdr.mjs"].map((f) => [f, fp(f)]));
export const enDays = () => { const D = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/khora/native/eval/law/provisional/confirm-R2_first_mention_lookahead/days.json", "utf8")), EN = new Set(["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"]), isEn = (k) => EN.has(k.split("/")[0]);
  const part = (a) => a.filter(isEn); return { CF: D.confirmSet.EN, SD: part(D.parts.SCOPER_DISCOVERY), SC: part(D.parts.SCOPER_CONFIRM), USED14: D.parts.USED14, INEL: part(D.parts.INELIGIBLE20), NONEN: { all: Object.values(D.parts).flat().filter((k) => !isEn(k)) } }; };
