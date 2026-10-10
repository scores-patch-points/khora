// langnorm.mjs -- collapse the pocket 'language' metadata codes (ISO 639-1 / 639-3 / local variant tags) to one stratum label per language; programming and notation codes (x-*) stay separate languages.
// Metadata only (pocket ids/language fields), never a token feature.
const MAP = { en: "en", eng: "en", "eng-tr": "en", "eng-aal": "en", "eng-ling": "en", "eng-var": "en", fr: "fr", fra: "fr", de: "de", deu: "de", "deu-1824": "de", es: "es", spa: "es", it: "it", ita: "it", "ita-med": "it", nl: "nl", nld: "nl",
  fi: "fi", fin: "fi", la: "la", lat: "la", ar: "ar", arb: "ar", "arb-cls": "ar", sa: "sa", san: "sa", jpn: "ja", "jpn-cls": "ja", zh: "zh", cmn: "zh", pt: "pt", por: "pt", ro: "ro", ron: "ro", sv: "sv", swe: "sv", sk: "sk", slk: "sk", ca: "ca", cat: "ca",
  lv: "lv", lav: "lv", no: "no", nob: "no", pl: "pl", pol: "pl", hu: "hu", hun: "hu", fa: "fa", fas: "fa", cs: "cs", ces: "cs", el: "el", ell: "el" };
export const langOf = (code) => MAP[code] ?? code;
