// eval/law/provisional/family-vs-relatedness/subbranch.mjs — SISTER-LANGUAGE CLUSTERS (sub-branch level of relatedness), linguistic knowledge written down before sister.mjs is run.
//
// DISCLOSURE. Written after discover.mjs finished and its dev results were read, and after a hand-picked list of 29 candidate sister pairs was printed with their dev single-donor AUCs
// (LATER-BOTH, FIRST-LEFT, FIRST-BOTH). The CLUSTER MEMBERSHIPS below follow the sub-branch conventions of the textbook classification (Romance: Italo-Western; Germanic: North vs
// West; Slavic: West / South / East; Indo-Aryan: Hindustani; Finnic; Baltic; Celtic; Turkic; Sinitic; Semitic), NOT the AUCs: every cluster of the textbook sub-branch scheme with at
// least two roster members is listed, including those whose dev AUCs were low (West Slavic, East Slavic, Finnic, Baltic, Sinitic), so that the scheme can fail. Singletons
// (eng: Anglo-Frisian; ron: Eastern Romance; ell, eus, ...) belong to no cluster. A language belongs to at most one cluster. Twin caveat: spa/cat (AnCora) and hrv/srp (SET) share an
// annotation team (groups.mjs `team`); sister.mjs reports every result with and without those dyads.
export const SUB = {
  // Italo-Western Romance (ron = Eastern Romance is a singleton)
  spa: "IWR", por: "IWR", glg: "IWR", cat: "IWR", fra: "IWR", ita: "IWR",
  // North Germanic; Continental West Germanic (eng = Anglo-Frisian singleton)
  dan: "NGm", nob: "NGm", swe: "NGm", deu: "CWGm", nld: "CWGm", afr: "CWGm",
  // Hindustani (mar = Southern Indo-Aryan singleton)
  hin: "Hind", urd: "Hind",
  // Slavic: South / West / East
  hrv: "SSl", srp: "SSl", slv: "SSl", bul: "SSl", ces: "WSl", slk: "WSl", pol: "WSl", rus: "ESl", ukr: "ESl",
  // other sister clusters
  est: "Finnic", fin: "Finnic", lav: "Baltic", lit: "Baltic", cym: "Celtic", gle: "Celtic", tur: "Turkic", uig: "Turkic", cmn: "Sinitic", lzh: "Sinitic", arb: "Semitic", mlt: "Semitic",
};
export const sub = (s) => SUB[s] ?? null;
export const CLUSTERS = [...new Set(Object.values(SUB))].map((c) => [c, Object.keys(SUB).filter((s) => SUB[s] === c)]);
