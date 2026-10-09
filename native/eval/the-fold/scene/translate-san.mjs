// translate-san.mjs — THE SANSKRIT DICTIONARY (janus, giver-named). IAST
// surface → English gloss, stem-keyed, with the longest-stem fallback exactly
// like translate.mjs — an inflected form (gahi, śrudhī, havāmahe) folds and
// finds its given stem. Only words the Rigveda read actually speaks, glossed
// from received Sanskrit (giver-named); a word not in the table wears the ?
// it never pretends.
const G = {
  // THE BEINGS (the Rigveda's own names — received, not invented)
  indra: "Indra", agni: "Agni", soma: "Soma", deva: "the gods", dive: "heaven",
  yajna: "the sacrifice", visva: "all", jana: "the people", rayi: "wealth",
  ratha: "the chariot", surya: "the sun", vrtra: "Vritra", dhana: "the prize",
  mitra: "Mitra", varuna: "Varuna", ushas: "the Dawn", dyu: "the day",
  hotr: "the priest", hota: "the priest", brahman: "the sacred word", prithu: "broad",
  agha: "evil", adri: "the mountain", arka: "the hymn", uktha: "the praise-word",
  susam: "the song", sustuti: "the glad praise", gayatra: "the song", juhu: "the fire-tongue",
  // THE ACTS (ritual verbs the hymns speak)
  gahi: "come", agahi: "come", piba: "drink", pibat: "drinking", vaha: "carry",
  havam: "invokes", hav: "call", havamahe: "we call", hvaye: "I invoke", huve: "I call",
  imahe: "we seek", srudhi: "hear", gavata: "sing", gaya: "sing", gata: "go",
  astu: "let it be", asti: "is", asi: "you are", irdhi: "stand", vardh: "strengthen",
  vardhantu: "may they strengthen", airayat: "stirred", avivrdh: "strengthened",
  yanti: "they go", yati: "goes", gacchati: "goes", ayati: "comes", yojat: "yokes",
  yuñjanti: "they yoke", sṛjatā: "release", asṛgram: "have flowed", sute: "pressed",
  sutam: "the pressed soma", arcati: "sings", gāyanti: "they sing", gṛṇanta: "singing",
  cetati: "perceives", ejati: "quivers", pinvate: "swells", idrajyati: "rules",
  vindhe: "I find", dadhe: "I hold", huvena: "called", dhārayat: "keeps",
  śaṁsaya: "declare", śaṁsyaṁ: "to be praised", kratu: "the rite",
  // the offering frame
  su: "press", suta: "pressed", sutam: "the pressed soma", ghṛta: "the ghee",
  havismat: "bearing oblation", inavat: "sends", pad: "footfall", duhanti: "they milk",
  īḍ: "invoke", il: "invoke", īḍe: "I invoke", prachetas: "the all-seeing",
  vṛṇīmahe: "we choose", vṛṇ: "choose", aśnavat: "may reach", dūtam: "the messenger",
  dūta: "the messenger", purohitam: "the priest", ratnadhātamam: "best of treasure-layers",
  bhadram: "good fortune", kariṣyasi: "you will work", ratna: "treasure", īmine: "I praise",
  śaṁ: "auspiciously", tvam: "you", tvāṁ: "thee", tvām: "thee", bhadra: "good fortune",
  bradhna: "the bay-horse", adri: "the mountain", aruṣam: "the ruddy one", carantam: "moving",
  tasthuṣaḥ: "standing", rocante: "they shine", rocanā: "the bright worlds", anūṣata: "they praised",
  śrutam: "renowned", ṛñjate: "they adorn", irajyati: "she rules", carṣaṇī: "the people",
  asmākam: "ours", arvatā: "by the steed", mahitvam: "glory", āśata: "they attain",
  vibhūtaya: "for the manifold", ūtaya: "for the help", māvate: "like thee", santi: "they are",
  enam: "him", ahāsata: "they abandoned", ṛgmiyam: "to be hymned", śatakrata: "Hundred-willed",
  vaṁśam: "the race", yemire: "they pressed", artha: "the aim", puruniṣṣidhe: "vast in giving",
  pratna: "ancient", devāḥ: "the gods", dyām: "heaven", viśvam: "all", saha: "with",
  // particles and space-fillers the read surfaces — gloss where they carry sense
  pratna: "ancient", puru: "many", svardrṣ: "sun-seeing", carṣanī: "the race",
  amṣa: "share", śrotra: "the hearing", śūṣa: "the might", dāśuṣe: "to the worshipper",
};

const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const nF = (s) => stF(s).replace(/[āīūṝṟḷ]/g, (c) => ({ ā: "a", ī: "i", ū: "u", ṝ: "r", ṟ: "r", ḷ: "l" }[c] ?? c));
const G2 = {};
for (const [k, v] of Object.entries(G)) { const s = nF(k); G2[k] = v; if (!(s in G2)) G2[s] = v; }
const g = (w) => {
  const bare = String(w ?? "").replace(/^\(\?/, "").replace(/\?$/, "").replace(/\)$/, "").trim();
  if (!bare) return "";
  const s = nF(bare);
  const hit = G2[s];
  if (hit) return hit;
  for (let L = Math.min(s.length, 8); L >= 4; L--) { const c = s.slice(0, L); if (c in G2) return G2[c]; }
  return `?${bare}`;
};
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  for (const w of process.argv.slice(2)) console.log(`${w} → ${g(w)}`);
}
export { g, G };  // G: the received dictionary heads — the anchors the khora field abuts