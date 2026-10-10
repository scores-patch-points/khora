// loaders/_sibling-oasym-ud.mjs — SIBLING treebank pockets for the replication of order.asym (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// UD TRAIN splits (/private/tmp/claude-501/tb/<stem>/train.conllu): the atlas treebank pockets read only the dev+test files of /private/tmp/claude-501/ud-eval, so these are new sentences.
// Stems were chosen for typological spread and size (>= ~38k tokens; the smallest atlas treebank cells were the weakest cells of the law): ita (Romance, SVO), rus (Slavic, free order),
// gle (Celtic, VSO), hye (Armenian, own script), tur (agglutinative, SOV, the smallest). None of these five stems has an atlas pocket (the atlas has no ita/rus/gle/hye/tur treebank pocket); eng (an atlas language) train is added
// as a same-language held-out split.
import { udTrain } from "./_sibling-oasym-common2.mjs";
export const SPECS = [
  { id: "oasym-ud-ita-train", stem: "ita", language: "ita" },
  { id: "oasym-ud-rus-train", stem: "rus", language: "rus" },
  { id: "oasym-ud-gle-train", stem: "gle", language: "gle" },
  { id: "oasym-ud-hye-train", stem: "hye", language: "hye" },
  { id: "oasym-ud-tur-train", stem: "tur", language: "tur" },
  { id: "oasym-ud-eng-train", stem: "eng", language: "eng", notes: "train split of the English treebank whose dev+test are the atlas pocket ud-eng" },
];
export const IDS = SPECS.map((s) => s.id);
export async function load(onlyIds = null) { return SPECS.filter((s) => !onlyIds || onlyIds.includes(s.id)).map((s) => udTrain(s)); }
