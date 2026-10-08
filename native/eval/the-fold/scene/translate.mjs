// translate.mjs — REC: render the machine's scene bullets in English.
// A coarse, DECLARED gloss of the EOT's own recurring units (giver: standard
// Greek-English vocabulary, my reading, marked (?) where disputed). The rendering
// is word-for-word of the machine's output — no invented prose.
import fs from "node:fs";

const G = {
  // centers / referents
  θυμός:"heart", ἀνήρ:"man", μέγας:"great", πατήρ:"father", ζεύς:"Zeus", φίλος:"friend", νεός:"young", χείρ:"hand",
  ναῦς:"ship", θεός:"god", θύρα:"door", ξεῖνος:"guest", ξένος:"guest", θάλασσα:"sea", πόντος:"deep-sea",
  οἶκος:"house", δόμος:"house", υἱός:"son", μνηστῆρες:"suitors", βοῦς:"cattle", σῖτος:"food", οἶνος:"wine",
  πῦρ:"fire", κακός:"evil", ὄλεθρος:"ruin", μοῖρα:"fate", κλέος:"glory", γάμος:"marriage", νόος:"mind",
  τιμή:"honor", γέρων:"old man", κῆρυξ:"herald", ἱερόν:"sacred", ἑλός:"salt-sea", μόρον:"death", κράτος:"strength",
  μέγιστον:"greatest", βουλή:"counsel", σκῆπτρον:"staff", φόνος:"slaughter", ἀγγελίη:"news", θρόνοι:"seats",
  κεφαλή:"head", κίονα:"pillar", τράπεζα:"table", καπνός:"smoke", γαίη:"earth", Σπάρτην:"Sparta", Ἀχαιῶν:"of the Achaeans",
  Τάφου:"of Taphos", Αἰθίοπας:"Ethiopians", ὀδύσσεια:"the Odyssey", μνέστερ:"suitors", κέρδος:"gain", ὧραι:"seasons",
  δῶμα:"hall", τιμήν:"honor", ἁλός:"salt-sea",
  // verbs / small words
  ἔγνω:"recognized", ἐρρύσατο:"rescued", ἤσθιον:"they ate", εἰπὲ:"say!", εἶναι:"to be", ἦλθε:"came", ἦλθον:"they came",
  ἐόντας:"being", φασι:"they say", ἔμμεναι:"to be", ἔχουσιν:"they hold", ἔχει:"has", ἔχειν:"to hold", ἔχον:"having",
  πάσχει:"suffers", πάσχειν:"to suffer", ἐστι:"is", ἐστὶν:"is", εἰσι:"are", οἶδεν:"knows", νοῆσαι:"to perceive",
  ἔδωκε:"gave", δυνήσεται:"will be able", ὃν:"him", νοστῆσαι:"to return home", εἴπῃ:"say", πέμψω:"I will send",
  ἀκούσῃ:"may hear", φέρον:"bearing", εἵλετο:"chose", ἄλκιμον:"strong", ἴδε:"saw", ἐλθὼν:"having come", δώματα:"halls",
  στάς:"standing", ἐδέξατο:"received", φωνήσας:"having spoken", χαῖρε:"greet!", ἔστησε:"set up", ἵστατο:"stood",
  νίψασθαι:"to wash", φέρουσα:"bearing (f.)", παρεόντων:"of those present", παντοίων:"of all kinds", παρέθηκεν:"set before",
  σχὼν:"having seized", ἤγαγον:"they led", πλέων:"sailing", σίδηρον:"iron", ἕστηκεν:"stands", ἀλλήλων:"of each other",
  τέθνηκε:"is dead", ποιῆσαι:"to make", δύναται:"is able", κεῖται:"lies", φέρει:"bears", ἐλθὲ:"come!", ἐξιέναι:"to go out",
  δοκέει:"seems", ἄμεινον:"better", ἔλθοι:"would come", οἴχεται:"is gone", ἀπώλετο:"perished", πείθομαι:"I am persuaded",
  ἀγορεύειν:"to address the assembly", ἤγειρε:"roused", εἰδώς:"knowing", λύει:"dissolves", ἀγορὰς:"assemblies",
  κέρδιον:"more profitable", βάλε:"threw", ἴσασι:"they know", γνῶναι:"to recognize", φρονέων:"thinking", ἐπιεικὲς:"reasonable",
  ἄγε:"come on", δότε:"give!", καθήμενος:"sitting", ἐφώνησεν:"spoke", νιψάμενος:"having washed", εἰμι:"I am", ἰὼν:"going",
  εὗρε:"found", γελάσας:"laughing", μελέτω:"let it be cared for", ἄξει:"will lead", ἐθέλει:"wishes", ἐλθεῖν:"to come",
  ἐνείκῃ:"may bring", βάλῃ:"may throw", ἡμέας:"us", ἀπόληται:"perish", κοίλης:"hollow", ὦρσε:"roused", κεχρημένον:"needing",
  ἔτος:"year", ὧραι:"hours/seasons", εἴη:"be", σε:"you", τινες:"some", τινα:"someone", νοστήσαντα:"having returned home",
  γενοίατο:"might be born", ἀπολέσθαι:"to perish", ἀνθρώπων:"of men", ὁδὸς:"road", σέ:"you", ἥν:"which",
  ἱερὸν:"sacred", ἱερόν:"sacred", γυνή:"woman", πατρός:"father", οὗτος:"this one", οὐρανός:"sky", νηῦς:"ship", θεοί:"gods",
  ιερ:"sacred", ολεθρ:"ruin", φιλ:"friend", υιος:"son", προτ:"first", σιτ:"food", κιο:"pillar", ποντ:"deep-sea",
  ετος:"year", αχαι:"Achaeans", τιν:"some", οιν:"wine", μνεστερ:"suitors", γυν:"woman", δομ:"house", οικ:"house",
  χρη:"need", άνδρ:"man", γερο:"old man", ον:"him", θεων:"of the gods", ανθρωπ:"men", πάντες:"all", πολλα:"many",
  // PROPER NAMES — the beings INS resolves; every case-form folds to the name
  οδυσσε:"Odysseus", οδyss:"Odysseus", τηλεμαχ:"Telemachus", τηλ:"Telemachus", αθην:"Athena", αθηναιη:"Athena",
  πηνελοπ:"Penelope", πηναλοπ:"Penelope", μενελα:"Menelaus", νεστ:"Nestor", ορεστ:"Orestes", ζευσ:"Zeus", ζευς:"Zeus",
  διος:"Zeus", δια:"Zeus", ιθακ:"Ithaca", αργο:"Argos", σπαρτ:"Sparta", ταφ:"Taphos", φαι:"the Phaeacians",
  αχιλλ:"Achilles", αγαμεμν:"Agamemnon", κλυταιμ:"Clytemnestra", ελεν:"Helen", θεοκλ:"Theoclymenus",
  ευρυμ:"Eurymachus", αντιν:"Antinous", ευπε:"Eupeithes", αμφιν:"Amphinomus", κτισ:"Ctesippus",
  ψυχ:"soul", χρυσ:"gold", ελαι:"oil", θε:"divine", ελθ:"coming", δωσ:"giving", πεμπ:"sending",
};
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const fold = (k) => k.replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
const G2 = {};
for (const [k, v] of Object.entries(G)) { const s = fold(stF(k)); G2[k] = v; if (!(s in G2)) G2[s] = v; }
const g = (w) => {
  if (w === "◦") return "·";
  const k = stF(w), s = fold(k);
  return G2[k] ?? G2[s] ?? `(?${w})`;
};
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const src = fs.readFileSync(process.argv[2] || "odyssey-ms.log", "utf8");
  for (const line of src.split("\n")) {
    const m = /^- scene\s+(\d+)\s+\[(.*?)\]\s+(.*)$/.exec(line);
    if (!m) continue;
    const center = m[2].replace(/^⛧ | \d+\.\d+/g, "");
    const frags = m[3].split(" · ").map((f) => {
      const x = /^(?:(\S+)\.)?(\S+)(?:\s+(\S+))?$/.exec(f.trim());
      if (!x) return f;
      const subj = x[1] ? `${g(x[1])}.` : "";
      const verb = g(x[2]);
      const obj = x[3] ? " " + g(x[3]) : "";
      return `${subj}${verb}${obj}`;
    });
    console.log(`- scene ${m[1]} [${g(center.trim())}]  ${frags.join(" · ")}`);
  }
}
export { g };