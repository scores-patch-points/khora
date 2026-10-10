// loaders/_sibling-rigidl-law.mjs — NEW legal pocket for the SIBLING REPLICATION of comp.rigidL (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
//  rl-law-fr-heldout : HELD-OUT PIECES of the French statutes. The atlas pocket fm-law-fr cuts the 7 natural law files of ethos 06-government-legal/world-legislation/fr into 146 pieces of <= ~6000 tokens
//     (loaders/_fm_common.mjs finalize) and keeps 50 of them whole in sha256("fm-law-fr":piece) order up to the 300k cap (297,534 tokens; estimated 858,933 before the cap). The other 96 pieces are in no atlas pocket.
//     The piece cutting and the atlas selection are recomputed here with a line-for-line copy of finalize (same tokeniser tokDefault, same sentence rule lawDocs) and re-checked against the atlas figures
//     (meta.atlasCheck); the sibling is built from the pieces the atlas did NOT take, whole pieces in sha256("rl-law-fr-heldout":piece) order up to 300000 tokens.
//     HONEST LIMIT: held-out PIECES of the same codes (same statutes, different articles), not a new jurisdiction: it tests sampling stability and register, not independence of legal system.
import { sha256, MAX_TOKENS, tokenCount } from "../lib/pocket.mjs";
import { tokDefault, unitsOf, MAXDOC, MIN_PIECE } from "./_fm_common.mjs";
import * as S from "./_fm_legal_src.mjs";

export const IDS = ["rl-law-fr-heldout"];
function pieceTable(nat0, id) {
  const nat = nat0.map((d) => d.filter((s) => s && s.trim())).filter((d) => d.length), tok = tokDefault;
  let c = 0, t = 0;
  outer: for (const d of nat) for (const s of d) { c += s.length; t += tok(s).length; if (t >= 3000 || c > 60000) break outer; }
  const cpt = t ? c / t : 6, totalChars = nat.reduce((a, d) => a + d.reduce((x, s) => x + s.length, 0), 0);
  const pieceTok = Math.min(MAXDOC, Math.max(MIN_PIECE, Math.round(totalChars / cpt / 40))), maxChars = Math.max(1000, Math.round(pieceTok * cpt)), pieces = [];
  for (const d of nat) {
    const C = d.reduce((a, s) => a + s.length, 0);
    if (C <= maxChars) { pieces.push(d); continue; }
    const k = Math.ceil(C / maxChars), target = C / k; let cur = [], acc = 0, made = 0;
    for (const s of d) { cur.push(s); acc += s.length; if (made < k - 1 && acc >= target * (made + 1)) { pieces.push(cur); cur = []; made++; } }
    if (cur.length) pieces.push(cur);
  }
  return { pieces, nat: nat.length, pieceTok };
}
const orderOf = (id, n) => Array.from({ length: n }, (_, i) => i).map((i) => [sha256(`${id}:${i}`), i]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1])).map((x) => x[1]);
function takeWhole(id, pieces, allow) {
  const cache = new Map(), U = (i) => { let u = cache.get(i); if (!u) { u = unitsOf(pieces[i], tokDefault); cache.set(i, u); } return u; };
  const take = []; let acc = 0, capped = false;
  for (const i of orderOf(id, pieces.length)) { if (!allow(i)) continue; const u = U(i), n = tokenCount(u); if (!n) continue; if (acc + n > MAX_TOKENS) { capped = true; break; } take.push(i); acc += n; }
  take.sort((a, b) => a - b);
  return { take, tokens: acc, capped, U };
}
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(IDS[0])) return [];
  const { pieces, nat, pieceTok } = pieceTable(S.lawDocs(["fr"]), "fm-law-fr");
  const atlas = takeWhole("fm-law-fr", pieces, () => true), inAtlas = new Set(atlas.take);
  const r = takeWhole(IDS[0], pieces, (i) => !inAtlas.has(i)), units = [], docOf = [];
  r.take.forEach((pi, k) => { for (const u of r.U(pi)) { units.push(u); docOf.push(k); } });
  return [{ id: IDS[0], group: "sib", register: "legal", language: "fr", script: "latn", units, docOf, meta: {
    tokenisation: "lowercase NFC word tokens (maximal runs of letters, combining marks and digits; inner apostrophes kept so French elisions such as l'auteur are ONE token); tokens without a letter dropped; urls and markdown removed (loaders/_fm_common.mjs tokDefault)",
    docDef: `document = a piece (<= ~${pieceTok} tokens) of a French law file; whole pieces not taken by the atlas pocket fm-law-fr, in sha256(rl-law-fr-heldout:piece) order up to 300k tokens; unit = sentence (newline and . ! ? ; split), heading lines removed (lawDocs)`,
    source: "ethos/06-government-legal/world-legislation/fr (legalize.dev mirror) minus the atlas pieces", loader: "_sibling-rigidl-law.mjs",
    atlasCheck: { naturalDocs: nat, pieces: pieces.length, atlasPieces: atlas.take.length, atlasTokens: atlas.tokens, atlasCapped: atlas.capped, expected: { pieces: 146, docs: 50, tokens: 297534 }, reproduced: pieces.length === 146 && atlas.take.length === 50 && atlas.tokens === 297534 },
    notes: `HELD-OUT pieces of the same statutes: ${pieces.length - atlas.take.length} candidate pieces, ${r.take.length} taken (${r.tokens} tokens, capped ${r.capped})` } }];
}
