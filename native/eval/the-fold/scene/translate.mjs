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
  θαρσ:"courage", αεθλ:"contest", ορνη:"stirred", ιερο:"sacred", δα:"feast", μοιν:"alone", πανο:"all", γιγν:"become",
  δωμ:"halls", εχ:"have", φα:"say", πεμπ:"send", αγγελιη:"news", πρ:"before", πλοι:"sailing", μειν:"remain",
  κταν:"kill", πιω:"I drink", βαλλ:"throw", γυν:"woman", ανδ:"man", ποτ:"drink", δουλ:"slave", χω:"pour",
  ποτν:"mistress", ηρ:"hero", πνοι:"wind", σιτο:"food", κρε:"flesh", οιν:"wine", κακ:"evil", θαν:"die",
  προσφ:"address", φημ:"say", φατ:"say", φατο:"say", ερε:"ask", ειπ:"speak", εποτρυ:"urge", ιδ:"see", εχ:"have", βαιν:"board", κατ:"sit", ἑζ:"sit", ιεσθ:"go", βη:"go", ὀδυρ:"mourn", κλαι:"weep", μηρμηρ:"mull", ἑτοιμ:"ready", εκελευ:"bid", ἀπτομ:"set to",
  προσεφ:"address", προσεε:"address", εζετ:"sit", εζετο:"sit", βεσετ:"go", νειτ:"return", λισσ:"implore", λισσο:"implore",
   // the fold-summary vocabulary (2026-10-08; giver: my reading) — every form the
   // summary's 19 reportable scenes actually hit, so the mouth can phrase them all.
   οἶδα:"knows", μίσγεται:"mingles", ἔκτεινε:"killed", ἔθηκεν:"placed", φυτεύει:"grows",
   κέλευε:"bid!", κέλευσον:"bid", ἐκέλευον:"they bade", ἐκέλευσεν:"bade", ἀνώγει:"urges",
   μέλλεις:"you intend", δύναμαι:"I am able", ἤθελε:"he wished", ἴσχει:"holds", ἔχοι:"may hold",
   ἀκούειν:"to hear", ἀκούων:"hearing", ἀπώλεσα:"I ruined", ἵκετο:"reached", ἐτελέσθη:"was fulfilled",
   ἐλήλαται:"has been driven", ἐλθοῦσα:"having come (f.)", ἐλθόντα:"having come", ἐπιστάμενος:"knowing",
   ἕπεσθαι:"to follow", ἔοικε:"is fitting", ἔνι:"there is", παρεῖναι:"to be present", νοστήσας:"having returned home",
   πείθεσθαι:"to obey", πείθεσθαί:"to obey", θυγάτηρ:"daughter", θυγατήρ:"daughter", νύμφη:"nymph", νύμφ:"nymph",
   νῆσος:"island", νησ:"island", νης:"island", σχεδίη:"raft", σχεδι:"raft", μῆλα:"flocks", πέλαγος:"open sea",
   πένθος:"grief", νέον:"new", δόμον:"house", πάντα:"all things", ἅπαντα:"all", πάσχομεν:"we suffer", πάσχετε:"you suffer",
   βουλὰς:"counsels", δαῖτα:"feast", κεῖνον:"that one", ἄνδρες:"men", θεοὺς:"gods", παιδὸς:"of the child",
   Ἀχαιοί:"Achaeans", ἀχαιοί:"Achaeans", ἐγώ:"I", ἐγὼ:"I", ἐμοῦ:"of me", φίλοι:"friends", φίλον:"dear",
   πολλὴν:"much", πολλὸν:"much", ὅσον:"as much", ἄλλας:"others", ἄλλων:"of others", ἄνθος:"bloom",
   ἕκαστος:"each one", ἕρκος:"fence", θυμόν:"heart", χεῖρας:"hands", πόδας:"feet", προκείμενα:"lying before",
   οὓς:"whom", μοῦνος:"alone", μέσον:"middle", κακὰ:"evils", εἰσιν:"they are", εἶπες:"you said",
   διδοῖ:"gives", διδοῦσι:"they give", ἦγον:"they led", ἰόντες:"going", ἀεθλο:"contest", ἀέθλους:"contests",
   αεθλο:"contest", κλε:"glory", κλέος:"glory", δαις:"feast", νυμ:"nymph", μετέρχομαι:"I go among", πόθος:"longing",
   ἔργον:"the deed", ταῦτα:"these", πατρίδα:"homeland", τῶν:"of them", τοῦτο:"this", βουλοίμην:"I would wish",
   σὺ:"you", Ἀργείων:"of the Argives", ἔκβαλε:"he threw out", εἰπὸν:"having spoken", ἐθέλεις:"you wish",
   ἔκειτο:"was laid", ἔλαιον:"oil", ἐών:"being", οἶνον:"wine", τό:"the", τόν:"him", τὰ:"the", τήν:"her", αἱ:"the ones", θεοῖς:"to the gods", πατρις:"homeland", ἔπος:"word", με:"me",
   ποίει:"made", ποιήσατο:"made", τάμνετο:"hewed", πελέκκησεν:"felled", ξέσσε:"smoothed", ἤρμοσε:"fitted", ἤρμοσεν:"fitted",
   ἔνεικε:"brought", δῶκε:"gave", δίδωμι:"gives", ἤγαγε:"led", μήδετο:"devised", προέηκεν:"sent forth", στήσας:"having set",
   ἐφάνη:"appeared", ἵκετο:"reached", ἔστω:"be", δώσω:"I will give", ἀνέστη:"rose", μῆλα:"flocks", ὕλην:"wood", σχεδίην:"the raft",
   γαίη:"earth", νήσου:"of the island", ὀδυσσεύς:"Odysseus", ὀδυσσεῦ:"Odysseus", ὀδυσσῆι:"Odysseus", μήδετο:"devised the way", ΚΑΛΥΨΩ:"Calypso", Καλυψώ:"Calypso",
   οἶδας:"know", ἴδον:"saw", εὗρον:"they found", φεῦγε:"fled", φυτεύει:"grows", λιπέσθαι:"to leave behind", ἤγαγον:"they led",
   πλέεν:"sailed", πολλοὺς:"many", δείδιμεν:"we fear", ἴθυνε:"steers", ἄνωγε:"had commanded", ἐρα:"…", θάλασσαν:"the sea",
   παῖδα:"the child", ἐγὼ:"I", δαῖτα:"a feast", νήσῳ:"on the island", ἐπει:"when", πλόον:"a voyage", ὄρεα:"the mountains",
   σκέπαρνον:"the adze", πέλεκυν:"an axe", τέρετρα:"the borers", γόμφοισιν:"with pegs", ἱστία:"the sail", κάλως:"the halyards",
   ὅδος:"the way", δόων:"…", ναῦς:"a ship", φαιήκων:"of the Phaeacians", νήεσ̣ς:"…", φερέμεν:"to carry", πομπήν:"a sending home",
ἱέμενος:"longing", ἕκβαλε:"threw out", τάμνετο:"hewed", πελέκκησε:"felled", ξέσσε:"smoothed", ἤρμοσε:"fitted", γηθόσυνος:"glad",
    πρῶτα:"first things", πρῶτον:"the first", βασιλεύς:"a king", βασιλῆα:"the king", ὀγδοάτῃ:"the eighth",
    κτείνειν:"to smite", κτείνει:"smites", κτεῖναι:"to kill", κτεῖνε:"was slaying", μορ:"fate", μόρον:"fate", μοῖραν:"fate",
    ἄγων:"leading", ἄγει:"leads", ἄγον:"led", ἔπι:"atop", αὐτὸν:"him", αὐτῆς:"of her", αὐτό:"it", ἄλλα:"else", ἄλλων:"of the others",
    επ:"…",
};

const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const fold = (k) => k.replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
const G2 = {};
for (const [k, v] of Object.entries(G)) { const s = fold(stF(k)); G2[k] = v; if (!(s in G2)) G2[s] = v; }
const g = (w) => {
  if (w === "◦") return "·";
  // read past the case-doubt markers: `(?φίλοι)` is the seam's own uncertainty
  // wrapper, not part of the word — the mouth must see the word, not its doubt.
  const bare = String(w ?? "").replace(/^\(\?/, "").replace(/\?$/, "").replace(/\)$/, "").trim();
  if (!bare) return "";
  const k = stF(bare), s = fold(k);
  const exact = G2[k] ?? G2[s];
  if (exact) return exact;
  // LONGEST-STEM FALLBACK: the received dictionary is stem-keyed (φα:"say",
  // βαιν:"board") — an inflected surface (φάτο, ἕζετο) folds to a longer form
  // the table never listed, but its stem is the key. Walk longest→shortest and
  // return the first stem that is a key. This is exactly the giver's indexing;
  // nothing new is glossed, only already-given stems are found under surfaces.
  for (let L = Math.min(s.length, 6); L >= 4; L--) { const cand = s.slice(0, L); if (cand in G2) return G2[cand]; }
  return `?${bare}`;
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
export { g, G };  // G: the received dictionary heads — the ANCHORS the khora field abuts