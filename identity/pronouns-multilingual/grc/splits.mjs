// the split, as stated in PREREG-GRC.md (first 8 of the books by sha256(code) are development, the rest the untouched test)
import crypto from "node:crypto";
export const NT_CODES = "MATT MARK LUKE JOHN ACTS ROM 1COR 2COR GAL EPH PHIL COL 1THESS 2THESS 1TIM 2TIM TIT PHILEM HEB JAS 1PET 3JOHN JUDE REV".split(" ");
const h = (c) => crypto.createHash("sha256").update(c).digest("hex").slice(0, 8);
const sorted = [...NT_CODES].sort((a, b) => (h(a) < h(b) ? -1 : 1));
export const DEV = sorted.slice(0, 8), TEST = sorted.slice(8);
