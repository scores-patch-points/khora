// grammar-packs.js — each language's CLOSED classes, for grammar-ud.js. Everything here is declared (giver: that language's grammar, as any
// reference grammar lists it); open-class words never appear: their keys come from the glossary (Wiktionary) or stay the language's own lemma.
// A pack says which words carry negation, the agent of a passive, the base of a comparison, a reported or hedged clause, a quantity, a
// possession, a title; and its number and unit words. Where UD features carry the same thing (Polarity=Neg, Tense=Past, Mood=Cnd,
// PronType=Rel, Degree=Cmp), grammar-ud.js reads the feature first and the pack only as a fallback.

const set = (s) => new Set(s.split(/\s+/).filter(Boolean));
// unit words → [measure, factor to base, offset] (giver: the SI and customary definitions, named in each language)
const SI = (o) => Object.fromEntries(Object.entries(o).flatMap(([k, v]) => k.split("|").map((w) => [w, v])));
const LEN = (f) => ["length", f], MASS = (f) => ["mass", f], TIME = (f) => ["time", f], AREA = (f) => ["area", f];

export const PACKS = {
  es: {
    neg: set("no nunca jamás tampoco ni"), agent: set("por"), than: set("que"), more: set("más"), less: set("menos"), with: set("con"),
    reflexive: set("se me te nos os"), have: set("tener poseer"), proDrop: true, pronouns: set("él ella ellos ellas ello"), we: set("nosotros nosotras nuestro nuestra nuestros nuestras nos"), possessive: set("su sus suyo suya"),
    naming: set("llamar denominar nombrar apodar bautizar"), namingAs: set("conocer designar"), as: set("como"),
    namingPart: ["denominad", "llamad", "nombrad", "apodad", "bautizad"], namingPartAs: ["conocid", "designad"], report: set("decir afirmar asegurar informar creer sostener sugerir"), modal: set("poder deber"),
    quant: { todo: "all", toda: "all", todos: "all", todas: "all", cada: "all", alguno: "some", algunos: "some", algunas: "some", unos: "some", ningún: "none", ninguno: "none", ninguna: "none", muchos: "many", muchas: "many" },
    discourse: set("además sin_embargo por_ejemplo mientras_tanto en_cambio así_pues por_lo_tanto"), titles: set("dr dra sr sra don doña san santa rey reina presidente"),
    numbers: { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, mil: 1000 },
    scale: { mil: 1e3, millón: 1e6, millones: 1e6, "mil millones": 1e9 }, approx: set("aproximadamente unos unas cerca casi alrededor apenas más menos"),
    months: set("enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre"),
    units: SI({ "m|metro|metros": LEN(1), "km|kilómetro|kilómetros": LEN(1000), "cm": LEN(0.01), "milla|millas": LEN(1609.344), "pie|pies": LEN(0.3048), "kg|kilogramo|kilogramos|kilo|kilos": MASS(1), "g|gramo|gramos": MASS(0.001), "libra|libras|lb|lbs": MASS(0.4536), "tonelada|toneladas": MASS(1000),
      "segundo|segundos": TIME(1), "minuto|minutos|min": TIME(60), "hora|horas|h": TIME(3600), "día|días": TIME(86400), "año|años": TIME(31557600), "%|por_ciento": ["share", 0.01], "km²|km2|kilómetro_cuadrado|kilómetros_cuadrados": AREA(1e6), "m²|m2|metro_cuadrado|metros_cuadrados": AREA(1), "ha|hectárea|hectáreas": AREA(1e4) }),
  },
  fr: {
    // "pas", "plus", "jamais" … negate only beside "ne" ("il n'est plus"); alone they are a degree ("plus d'un cinquième": more than a fifth)
    neg: set("ne n' pas jamais plus aucun aucune guère nullement"), negNeedsNe: set("pas plus jamais aucun aucune guère nullement"), ne: set("ne n' n’"), agent: set("par"), than: set("que qu'"), more: set("plus"), less: set("moins"), with: set("avec"),
    reflexive: set("se s' s’ me m' m’ te t' t’ nous vous"), have: set("avoir posséder"), pronouns: set("il elle ils elles"), we: set("nous notre nos"), possessive: set("son sa ses leur leurs"), naming: set("appeler nommer dénommer surnommer baptiser"), namingAs: set("connaître désigner"), as: set("comme"), namingPart: ["appelé", "nommé", "dénommé", "surnommé", "baptisé", "dit", "dite"], namingPartAs: ["connu", "désigné"], report: set("dire affirmer déclarer rapporter croire prétendre suggérer"), modal: set("pouvoir devoir"),
    quant: { tout: "all", toute: "all", tous: "all", toutes: "all", chaque: "all", certains: "some", certaines: "some", quelques: "some", aucun: "none", aucune: "none", nul: "none", beaucoup: "many", plusieurs: "many" },
    discourse: set("par_exemple en_outre de_plus cependant toutefois en_effet par_ailleurs ainsi"), titles: set("dr m mme mlle saint sainte roi reine président"),
    numbers: { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100, mille: 1000 },
    scale: { mille: 1e3, million: 1e6, millions: 1e6, milliard: 1e9, milliards: 1e9 }, approx: set("environ quelque presque près autour quasiment à_peine plus moins"),
    months: set("janvier février mars avril mai juin juillet août septembre octobre novembre décembre"),
    units: SI({ "m|mètre|mètres": LEN(1), "km|kilomètre|kilomètres": LEN(1000), "cm": LEN(0.01), "mille|milles": LEN(1609.344), "pied|pieds": LEN(0.3048), "kg|kilogramme|kilogrammes|kilo|kilos": MASS(1), "g|gramme|grammes": MASS(0.001), "livre|livres|lb|lbs": MASS(0.4536), "tonne|tonnes": MASS(1000),
      "seconde|secondes": TIME(1), "minute|minutes|min": TIME(60), "heure|heures|h": TIME(3600), "jour|jours": TIME(86400), "an|ans|année|années": TIME(31557600), "%|pour_cent": ["share", 0.01], "km²|km2|kilomètre_carré|kilomètres_carrés": AREA(1e6), "m²|m2|mètre_carré|mètres_carrés": AREA(1), "ha|hectare|hectares": AREA(1e4) }),
  },
  de: {
    neg: set("nicht nie niemals kein keine keinen keinem keiner keines nirgends"), agent: set("von durch"), than: set("als"), more: set("mehr"), less: set("weniger"), with: set("mit"),
    reflexive: set("sich mich dich uns euch"), have: set("haben besitzen"), pronouns: set("er sie es"), we: set("wir uns unser unsere unserer unseren unserem unseres"), possessive: set("sein seine seiner seinen seinem seines ihr ihre ihrer ihren ihrem ihres"), naming: set("heißen nennen taufen"), namingAs: set("bezeichnen kennen"), as: set("als"), namingPart: ["genannt", "getauft"], namingPartAs: ["bekannt", "bezeichnet"], report: set("sagen behaupten erklären berichten glauben meinen vermuten"), modal: set("können dürfen mögen sollen müssen"),
    quant: { alle: "all", aller: "all", allen: "all", jeder: "all", jede: "all", jedes: "all", einige: "some", manche: "some", kein: "none", keine: "none", viele: "many" },
    discourse: set("außerdem zum_beispiel jedoch allerdings dennoch also übrigens"), titles: set("dr herr frau sankt könig königin präsident prof"),
    numbers: { ein: 1, eine: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, hundert: 100, tausend: 1000 },
    scale: { tausend: 1e3, million: 1e6, millionen: 1e6, milliarde: 1e9, milliarden: 1e9 }, approx: set("etwa ungefähr rund fast knapp circa ca über unter gut nur"),
    months: set("januar februar märz april mai juni juli august september oktober november dezember"),
    units: SI({ "m|meter": LEN(1), "km|kilometer": LEN(1000), "cm|zentimeter": LEN(0.01), "meile|meilen": LEN(1609.344), "fuß": LEN(0.3048), "kg|kilogramm|kilo": MASS(1), "g|gramm": MASS(0.001), "pfund": MASS(0.4536), "tonne|tonnen": MASS(1000),
      "sekunde|sekunden": TIME(1), "minute|minuten|min": TIME(60), "stunde|stunden|std": TIME(3600), "tag|tage|tagen": TIME(86400), "jahr|jahre|jahren": TIME(31557600), "%|prozent": ["share", 0.01], "km²|km2|quadratkilometer": AREA(1e6), "m²|m2|quadratmeter": AREA(1), "ha|hektar": AREA(1e4) }),
  },
  ja: {
    neg: set("ない ず ぬ ません なかっ"), agent: set("によって により"), than: set("より"), more: set("もっと より"), less: set(""), with: set("と"),
    have: set("持つ ある"), proDrop: true, pronouns: set("それ これ 彼 彼女 同"), we: set("我々 私たち 当社"), possessive: set("その"), naming: set(""), namingAs: set("呼ぶ 称する"), as: set("と"), report: set("言う 述べる 報告 主張 考える"), modal: set("かもしれない でしょう だろう"),
    quant: { すべて: "all", 全て: "all", 全部: "all", 各: "all", 一部: "some", いくつか: "some" },
    discourse: set("また さらに 例えば しかし 一方"), titles: set("博士 氏 さん 様 王 女王 大統領 教授"),
    numbers: { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 百: 100, 千: 1000 },
    scale: { 万: 1e4, 億: 1e8, 千: 1e3 }, approx: set("約 およそ 程度 ほど ほぼ 以上 以下"),
    months: set("月"),
    units: SI({ "m|メートル": LEN(1), "km|キロメートル": LEN(1000), "cm|センチ": LEN(0.01), "kg|キログラム|キロ": MASS(1), "g|グラム": MASS(0.001), "トン": MASS(1000), "秒": TIME(1), "分": TIME(60), "時間": TIME(3600), "日": TIME(86400), "年": TIME(31557600), "%|パーセント": ["share", 0.01], "km²|km2|平方キロメートル": AREA(1e6), "m²|m2|平方メートル": AREA(1), "ヘクタール": AREA(1e4) }),
    // a year written with its unit is a date, not a duration (1936年 is the year 1936; 3年 is three years)
    dateUnits: set("年"),
  },
};
