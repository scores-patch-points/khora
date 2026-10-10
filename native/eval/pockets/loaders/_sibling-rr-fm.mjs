// loaders/_sibling-rr-fm.mjs — HELD-OUT-DOCUMENT siblings of four atlas "fm" pockets, for the replication of comp.rigidR (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// The atlas fm loader (loaders/_fm_common.mjs finalize) cuts each source into pieces of <= ~6000 tokens, takes WHOLE pieces in sha256(id:pieceIndex) order and STOPS at the first piece that would pass the 300k cap.
// Four atlas pockets were capped with a large remainder (tokensBeforeCapEst in their meta.counts): fm-law-fr 858,933 (50 of 146 pieces kept), fm-factbook 896,616 (88 of 261), fm-wikipedia 482,304 (66 of 104),
// fm-ntrs-1965-71 755,383 (71 of 147). The pieces the atlas did NOT take are in no atlas pocket and are the material here. The piece construction and the atlas selection are COPIED line for line from finalize()
// (so the two sets are disjoint by construction); the source readers, tokeniser and cleaning are the atlas ones, imported unchanged (_fm_legal_src.mjs, _fm_ref_src.mjs, _fm_common.mjs).
//   rr-law-fr-heldout     legal         French legislation (7 codes), the 96 pieces the atlas pocket fm-law-fr did not take
//   rr-factbook-heldout   reference     CIA World Factbook entries, pieces not taken by fm-factbook
//   rr-wiki-heldout       encyclopedia  Wikipedia articles, pieces not taken by fm-wikipedia
//   rr-ntrs-heldout       academic      NASA NTRS reports 1965-71 (OCR text), pieces not taken by fm-ntrs-1965-71
// HONEST LIMIT: held-out PIECES of the same documents/codes/articles (neighbouring pieces of one text are not independent): they test sampling stability within a source, not generality across sources.
import { sha256, validate, tokenCount, MAX_TOKENS } from "../lib/pocket.mjs";
import { tokDefault, unitsOf, MIN_PIECE, MAXDOC } from "./_fm_common.mjs";
import * as L from "./_fm_legal_src.mjs";
import * as R from "./_fm_ref_src.mjs";

const TOK_W = "lowercase NFC word tokens (maximal runs of letters, combining marks and digits; inner apostrophes kept); tokens without a letter dropped; urls, markdown, html and tex math removed (the atlas fm tokeniser)";
const SPECS = [
  { id: "rr-law-fr-heldout", atlasId: "fm-law-fr", register: "legal", language: "fr", build: () => L.lawDocs(["fr"]) },
  { id: "rr-factbook-heldout", atlasId: "fm-factbook", register: "reference", language: "en", build: L.factbookDocs },
  { id: "rr-wiki-heldout", atlasId: "fm-wikipedia", register: "encyclopedia", language: "en", build: R.wikiDocs },
  { id: "rr-ntrs-heldout", atlasId: "fm-ntrs-1965-71", register: "academic", language: "en", build: () => R.ntrsDocs(1965, 1971) },
];
export const IDS = SPECS.map((s) => s.id);
/** the pieces exactly as _fm_common.finalize builds them (no blockUnits, tok = tokDefault) */
function piecesOf(naturalDocs) {
  const nat = []; naturalDocs.forEach((d) => { const f = d.filter((s) => s && s.trim()); if (f.length) nat.push(f); });
  let c = 0, t = 0;
  outer: for (const d of nat) for (const s of d) { c += s.length; t += tokDefault(s).length; if (t >= 3000 || c > 60000) break outer; }
  const cpt = t ? c / t : 6, totalChars = nat.reduce((a, d) => a + d.reduce((x, s) => x + s.length, 0), 0);
  const pieceTok = Math.min(MAXDOC, Math.max(MIN_PIECE, Math.round(totalChars / cpt / 40))), maxChars = Math.max(1000, Math.round(pieceTok * cpt)), pieces = [];
  for (const d of nat) {
    const C = d.reduce((a, s) => a + s.length, 0);
    if (C <= maxChars) { pieces.push(d); continue; }
    const k = Math.ceil(C / maxChars), target = C / k; let cur = [], acc = 0, made = 0;
    for (const s of d) { cur.push(s); acc += s.length; if (made < k - 1 && acc >= target * (made + 1)) { pieces.push(cur); cur = []; made++; } }
    if (cur.length) pieces.push(cur);
  }
  return { pieces, pieceTok, cpt };
}
/** the order and stop rule of finalize: sha256(id:i) order, empty pieces skipped, STOP at the first piece that would pass the cap -> set of kept piece indices */
function takeOf(id, pieces, unitsOfPiece, allowed = null) {
  const hk = pieces.map((_, i) => sha256(`${id}:${i}`)), order = pieces.map((_, i) => i).sort((a, b) => (hk[a] < hk[b] ? -1 : hk[a] > hk[b] ? 1 : a - b)), take = []; let acc = 0;
  for (const i of order) { if (allowed && !allowed.has(i)) continue; const n = tokenCount(unitsOfPiece(i)); if (!n) continue; if (acc + n > MAX_TOKENS) break; take.push(i); acc += n; }
  return take.sort((a, b) => a - b);
}
function build(s) {
  const { pieces, pieceTok } = piecesOf(s.build()), cache = new Map(), up = (i) => { let u = cache.get(i); if (!u) { u = unitsOf(pieces[i], tokDefault); cache.set(i, u); } return u; };
  const atlas = new Set(takeOf(s.atlasId, pieces, up)), left = new Set(pieces.map((_, i) => i).filter((i) => !atlas.has(i)));
  const mine = takeOf(s.id, pieces, up, left), units = [], docOf = [];
  mine.forEach((pi, k) => { for (const u of up(pi)) { units.push(u); docOf.push(k); } });
  const p = { id: s.id, group: "sib", register: s.register, language: s.language, script: "latn", units, docOf, meta: { tokenisation: TOK_W,
    docDef: `pieces of <= ~${pieceTok} tokens (equal cuts of long source files at unit boundaries, exactly as the atlas); whole pieces NOT taken by ${s.atlasId}, in sha256(id:pieceIndex) order up to 300k tokens; unit = sentence/line as the atlas`,
    source: `held-out pieces of the source of ${s.atlasId}`, sibling: true, atlasKin: s.atlasId, notes: `${pieces.length} pieces in all; atlas took ${atlas.size}; ${left.size} held-out candidates; ${mine.length} in this pocket (${tokenCount(units)} tokens); NEIGHBOURING PIECES OF THE SAME TEXTS: not independent sources` } };
  validate(p); return p;
}
export async function load(onlyIds = null) { return SPECS.filter((s) => !onlyIds || onlyIds.includes(s.id)).map(build); }
