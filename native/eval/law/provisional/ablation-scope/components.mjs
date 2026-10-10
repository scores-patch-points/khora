// components.mjs — the 223 named components of an impact record, in the same order as scan-components.mjs (a copy; scan-components.mjs runs its main on import).
import { FAMILIES, DELTA_TYPES, SIG_LABELS, ATM_LABELS, SPAN_LABELS, C_LABELS } from "../../impact.mjs";
export const NAMES = [
  ...FAMILIES.flatMap((f) => [0, 1, 2].flatMap((b) => DELTA_TYPES.map((t) => `counts.${f}.r${b}.${t}`))),
  ...SIG_LABELS.map((l) => `sig.${l}`), ...ATM_LABELS.map((l) => `atm.${l}`), ...SPAN_LABELS.map((l) => `span.${l}`), ...C_LABELS.map((l) => `c.${l}`),
  "extent.tokens", "extent.frames", "extent.radius", "noSlot", "nTokenSlots", "laterEdges", "isNull"];
export const vec = (rec) => [...rec.counts, ...rec.sig, ...rec.atm, ...rec.span, ...rec.c, rec.extent.tokens, rec.extent.frames, rec.extent.radius, rec.noSlot ? 1 : 0, rec.nTokenSlots, rec.laterEdges, rec.isNull ? 1 : 0];
export const indexOfName = (n) => { const j = NAMES.indexOf(n); if (j < 0) throw new Error(`unknown component ${n}`); return j; };
