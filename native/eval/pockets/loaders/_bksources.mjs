// loaders/_bksources.mjs — the source table of the "bk" group. One entry per pocket. Paths are relative to /Users/mlacy/Documents/3.0/ethos.
// Every entry's language/title was checked against the TEXT of the file, not its file name (three file names are wrong: see notes on bk-botanic-garden, bk-lesmis, and the duplicate Dracula).
const G = "01-literature-books/gutenberg/", T = "01-literature-books/gitenberg/", F = "15-western-canon/first-folio/", V = "20-first-person-voices/", O = V + "written-oral-histories/";
const book = (id, files, title, author, register, language, extra = {}) => ({ id, files: [].concat(files), title, author, register, language, ...extra });
const tr = (from) => ({ notes: `English translation (from ${from}); the pocket measures the translated English text` });
export const SPECS = [
  // ---- 01-literature-books / gitenberg (Project Gutenberg texts with START/END markers)
  book("bk-treasure-island", T + "pg120_Treasure-Island.txt", "Treasure Island", "R. L. Stevenson", "novel", "en"),
  book("bk-prince", T + "pg1232_The-Prince.txt", "The Prince", "N. Machiavelli", "treatise", "en", tr("Italian")),
  book("bk-great-expect", T + "pg1400_Great-Expectations.txt", "Great Expectations", "C. Dickens", "novel", "en"),
  book("bk-federalist", T + "pg1404_The-Federalist-Papers.txt", "The Federalist Papers", "Hamilton, Madison, Jay", "treatise", "en"),
  book("bk-common-sense", T + "pg147_Common-Sense.txt", "Common Sense", "T. Paine", "treatise", "en"),
  book("bk-emma", T + "pg158_Emma.txt", "Emma", "J. Austen", "novel", "en"),
  book("bk-sense-sens", T + "pg161_Sense-and-Sensibility.txt", "Sense and Sensibility", "J. Austen", "novel", "en"),
  book("bk-call-wild", T + "pg215_The-Call-of-the-Wild.txt", "The Call of the Wild", "J. London", "novel", "en"),
  book("bk-heart-dark", T + "pg219_Heart-of-Darkness.txt", "Heart of Darkness", "J. Conrad", "novel", "en"),
  book("bk-jungle-book", T + "pg236_The-Jungle-Book.txt", "The Jungle Book", "R. Kipling", "children", "en"),
  book("bk-crime-pun", T + "pg2554_Crime-and-Punishment.txt", "Crime and Punishment", "F. Dostoevsky", "novel", "en", tr("Russian")),
  book("bk-dracula", T + "pg345_Dracula.txt", "Dracula", "B. Stoker", "novel", "en", { notes: "01-literature-books/gutenberg/pg345_Dracula.txt is a second edition of the same book and is NOT loaded (duplicate)" }),
  book("bk-time-machine", T + "pg35_The-Time-Machine.txt", "The Time Machine", "H. G. Wells", "novel", "en"),
  book("bk-war-worlds", T + "pg36_The-War-of-the-Worlds.txt", "The War of the Worlds", "H. G. Wells", "novel", "en"),
  book("bk-anne-gg", T + "pg45_Anne-of-Green-Gables.txt", "Anne of Green Gables", "L. M. Montgomery", "children", "en"),
  book("bk-little-women", T + "pg514_Little-Women.txt", "Little Women", "L. M. Alcott", "novel", "en"),
  book("bk-crusoe", T + "pg521_The-Life-and-Adventures-of-Robinson-Crusoe.txt", "Robinson Crusoe", "D. Defoe", "novel", "en"),
  book("bk-oz", T + "pg55_The-Wonderful-Wizard-of-Oz.txt", "The Wonderful Wizard of Oz", "L. F. Baum", "children", "en"),
  book("bk-wuthering", T + "pg768_Wuthering-Heights.txt", "Wuthering Heights", "E. Bronte", "novel", "en"),
  book("bk-gulliver", T + "pg829_Gulliver-s-Travels.txt", "Gulliver's Travels", "J. Swift", "novel", "en"),
  // ---- 01-literature-books / gutenberg (headers already stripped upstream in most files)
  book("bk-alice", G + "pg11_Alice_s_Adventures_in_Wonderland.txt", "Alice's Adventures in Wonderland", "L. Carroll", "children", "en"),
  book("bk-looking-glass", G + "pg12_Through_the_Looking_Glass.txt", "Through the Looking-Glass", "L. Carroll", "children", "en"),
  book("bk-pride-prej", G + "pg1342_Pride_and_Prejudice.txt", "Pride and Prejudice", "J. Austen", "novel", "en"),
  book("bk-dante", G + "pg13453_The_Divine_Comedy_by_Dante.txt", "The Divine Comedy (Longfellow)", "Dante Alighieri", "poetry", "en", { paraBreak: false, ...tr("Italian") }),
  book("bk-lesmis", G + "pg135_Les_Mis_rables__French_.txt", "Les Miserables (Hapgood)", "V. Hugo", "novel", "en", { notes: "file name says (French) but the text is Isabel Hapgood's ENGLISH translation (checked: top tokens the/of/and); labelled en" }),
  book("bk-middlemarch", G + "pg145_Middlemarch-George-Eliot.txt", "Middlemarch", "George Eliot", "novel", "en"),
  book("bk-tom-sawyer", G + "pg1661_The_Adventures_of_Tom_Sawyer.txt", "The Adventures of Tom Sawyer", "M. Twain", "novel", "en"),
  book("bk-aeneid-la", G + "pg17270_The_Aeneid__Latin_.txt", "Aeneid (Latin)", "Virgil", "poetry", "la", { paraBreak: false }),
  book("bk-dorian-gray", G + "pg174_The_Picture_of_Dorian_Gray.txt", "The Picture of Dorian Gray", "O. Wilde", "novel", "en"),
  book("bk-whitman", G + "pg2397_Leaves_of_Grass_by_Whitman.txt", "Leaves of Grass", "W. Whitman", "poetry", "en", { paraBreak: false }),
  book("bk-faust-de", G + "pg2636_Faust__German_.txt", "Faust I (German)", "J. W. Goethe", "drama", "de", { drama: "allcaps" }),
  book("bk-moby-dick", G + "pg2701_Moby_Dick.txt", "Moby-Dick", "H. Melville", "novel", "en"),
  book("bk-einstein", G + "pg32063_On_the_Electrodynamics_of_Moving_Bodies__Einstein_.txt", "The Principle of Relativity (Einstein, Minkowski et al.)", "A. Einstein et al.", "academic", "en", { notes: "English translations of the original relativity papers; contains formula residue (single-letter variables)" }),
  book("bk-botanic-garden", G + "pg10671_The_Iliad__Greek_.txt", "The Botanic Garden, part II (The Loves of the Plants)", "E. Darwin", "poetry", "en", { paraBreak: false, notes: "file name says The Iliad (Greek) but the text is Erasmus Darwin's English poem The Botanic Garden part II with prose notes (checked on head, top tokens and Latin script only); labelled by content" }),
  book("bk-ulysses", G + "pg4300_Ulysses.txt", "Ulysses", "J. Joyce", "novel", "en"),
  book("bk-quixote-es", G + "pg5196_Don_Quixote__Spanish_.txt", "Don Quijote (Spanish)", "M. de Cervantes", "novel", "es"),
  book("bk-republic", G + "pg55201_The_Republic_by_Plato.txt", "The Republic (Jowett)", "Plato", "treatise", "en", tr("Greek")),
  book("bk-meditations", G + "pg5827_Meditations_by_Marcus_Aurelius.txt", "Meditations", "Marcus Aurelius", "treatise", "en", tr("Greek")),
  book("bk-poor-relief", G + "pg59129_Leviathan_by_Hobbes.txt", "The Early History of English Poor Relief (1900)", "E. M. Leonard", "academic", "en", { notes: "file name says Leviathan by Hobbes but the text is E. M. Leonard's 1900 monograph on English poor relief (checked: no occurrence of 'leviathan' or 'hobbes', 174 of 'poor relief'); labelled by content" }),
  book("bk-origin-species", G + "pg62168_The_Origin_of_Species_by_Darwin.txt", "On the Origin of Species", "C. Darwin", "academic", "en"),
  book("bk-sherlock", G + "pg768_The_Adventures_of_Sherlock_Holmes.txt", "The Adventures of Sherlock Holmes", "A. C. Doyle", "novel", "en"),
  book("bk-bge", G + "pg8394_Beyond_Good_and_Evil_by_Nietzsche.txt", "Beyond Good and Evil", "F. Nietzsche", "treatise", "en", tr("German")),
  book("bk-frankenstein", G + "pg84_Frankenstein.txt", "Frankenstein", "M. Shelley", "novel", "en"),
  book("bk-two-cities", G + "pg98_A_Tale_of_Two_Cities.txt", "A Tale of Two Cities", "C. Dickens", "novel", "en"),
  // ---- 15-western-canon: one play in four textual worlds (early-modern spelling, modernised, German, French) and a second play
  book("bk-hen4-folio", F + "henry-iv-part-1.txt", "Henry IV part 1 (1623 Folio spelling)", "W. Shakespeare", "drama", "en", { drama: "folio", notes: "original 1623 orthography (u/v, i/j, -e endings kept); bk-hen4-folio, -modern, -de and -fr are four witnesses of ONE play and must not be counted as independent evidence" }),
  book("bk-hen4-modern", F + "henry-iv-part-1-modern.txt", "Henry IV part 1 (modern spelling)", "W. Shakespeare", "drama", "en", { drama: "allcaps", notes: "same play as bk-hen4-folio; do not count the two as independent evidence" }),
  book("bk-hen4-de", F + "henry-iv-part-1-german-wieland.txt", "Heinrich IV Teil 1 (Wieland)", "W. Shakespeare / C. M. Wieland", "drama", "de", { drama: "capline", stageParen: true, notes: "same play as bk-hen4-folio, German translation (1760s spelling)" }),
  book("bk-hen4-fr", F + "henry-iv-part-1-french-guizot.txt", "Henri IV 1re partie (Guizot)", "W. Shakespeare / F. Guizot", "drama", "fr", { drama: "fr", stageParen: true, notes: "same play as bk-hen4-folio, French translation; editorial notes in [Note N: ...] and the translator's preface kept out where bracketed" }),
];
// ---- 20-first-person-voices: individual works and written oral histories
export const SPECS2 = [
  book("bk-douglass-narr", V + "douglass-narrative.txt", "Narrative of the Life of Frederick Douglass (1845)", "F. Douglass", "memoir", "en"),
  book("bk-douglass-bond", V + "douglass-my-bondage.txt", "My Bondage and My Freedom (1855)", "F. Douglass", "memoir", "en"),
  book("bk-eastman", V + "eastman-indian-boyhood.txt", "Indian Boyhood (1902)", "C. A. Eastman", "memoir", "en"),
  book("bk-equiano", V + "equiano-narrative.txt", "Interesting Narrative of Olaudah Equiano (1789)", "O. Equiano", "memoir", "en"),
  book("bk-hirschfeld-de", V + "hirschfeld-transvestites.txt", "Die Transvestiten (1910)", "M. Hirschfeld", "academic", "de", { notes: "German original; case histories and clinical prose" }),
  book("bk-jacobs", V + "jacobs-incidents.txt", "Incidents in the Life of a Slave Girl (1861)", "H. Jacobs", "memoir", "en"),
  book("bk-godwin-memoirs", V + "wollstonecraft-vindication.txt", "Memoirs of the Author of A Vindication of the Rights of Woman (1798)", "W. Godwin", "biography", "en", { notes: "file name says Wollstonecraft, Vindication, but the text is William Godwin's third-person MEMOIRS of her (title page, first chapter and tail checked); it is NOT her first-person voice" }),
  book("bk-woolf", V + "woolf-room-of-ones-own.txt", "A Room of One's Own (1929)", "V. Woolf", "essay", "en"),
  book("bk-zitkala", V + "zitkala-american-indian-stories.txt", "American Indian Stories (1921)", "Zitkala-Sa", "memoir", "en", { notes: "autobiographical sketches plus stories" }),
  book("bk-ambedkar", O + "ambedkar-writings-speeches-vol1.txt", "Writings and Speeches vol 1", "B. R. Ambedkar", "essay", "en"),
  book("bk-antin", O + "antin-promised-land.txt", "The Promised Land (1912)", "M. Antin", "memoir", "en"),
  book("bk-beers", O + "beers-a-mind-that-found-itself.txt", "A Mind That Found Itself (1908)", "C. Beers", "memoir", "en"),
  book("bk-dubois", O + "dubois-souls-of-black-folk.txt", "The Souls of Black Folk (1903)", "W. E. B. Du Bois", "essay", "en"),
  book("bk-wilson-memoirs", O + "harriette-wilson-memoirs.txt", "Memoirs of Harriette Wilson", "H. Wilson", "memoir", "en"),
  book("bk-mayhew1", O + "mayhew-london-labour-vol1.txt", "London Labour and the London Poor, vol 1", "H. Mayhew", "reportage", "en", { notes: "verbatim street interviews inside investigator's prose" }),
  book("bk-mayhew2", O + "mayhew-london-labour-vol2.txt", "London Labour and the London Poor, vol 2", "H. Mayhew", "reportage", "en"),
  book("bk-mayhew3", O + "mayhew-london-labour-vol3.txt", "London Labour and the London Poor, vol 3", "H. Mayhew", "reportage", "en"),
  book("bk-mother-jones", O + "mother-jones-autobiography.txt", "Autobiography of Mother Jones (1925)", "Mother Jones", "memoir", "en"),
  book("bk-riis", O + "riis-how-the-other-half-lives.txt", "How the Other Half Lives (1890)", "J. Riis", "reportage", "en"),
  book("bk-somerville", O + "somerville-recollections-to-old-age.txt", "Personal Recollections ... to Old Age", "M. Somerville", "memoir", "en"),
  book("bk-stanton", O + "stanton-eighty-years-and-more.txt", "Eighty Years and More (1898)", "E. C. Stanton", "memoir", "en"),
  book("bk-winslow", O + "winslow-diary-1771.txt", "Diary of Anna Green Winslow (1771)", "A. G. Winslow", "memoir", "en", { notes: "child's diary, 18th-century spelling" }),
];
/** WPA slave narratives, one pocket per state, grouped by the state named in the TEXT ("VOLUME <n> <STATE> NARRATIVES" in the header), NOT by file name: six file names are wrong
 *  (e.g. "iowa-18485" holds Georgia part 4, "indiana-18484" Georgia part 3, "texas-part-5" Alabama, "south-carolina-part-5" Arkansas, "south-carolina-part-6" Texas part 2, "arkansas-part-6" Indiana). */
export const WPA = { alabama: "al", arkansas: "ar", florida: "fl", georgia: "ga", indiana: "in", iowa: "ia", missouri: "mo", "north carolina": "nc", oklahoma: "ok", "south carolina": "sc", texas: "tx" };
export function wpaSpecs(fs, path, ethos) {
  const dir = V + "slave-narratives-wpa/", names = fs.readdirSync(path.join(ethos, dir)).filter((f) => f.endsWith(".txt")).sort(), by = {}, mislabelled = [];
  for (const f of names) {
    const head = fs.readFileSync(path.join(ethos, dir, f), "utf8").replace(/\r/g, "").slice(0, 9000);
    const m = head.match(/VOLUME\s+([IVX]+)\s+([A-Z][A-Z ]+?)\s+NARRATIVES/), st = m ? m[2].trim().toLowerCase() : null;
    if (!st || !WPA[st]) { mislabelled.push(`${f}: state not identified`); continue; }
    (by[st] ??= []).push(dir + f);
    const nameState = Object.keys(WPA).find((k) => f.includes(k.replace(" ", "-")));
    if (nameState !== st) mislabelled.push(`${f}: file name says ${nameState}, text says ${st}`);
  }
  const specs = Object.entries(by).map(([st, files]) => book(`bk-wpa-${WPA[st]}`, files, `WPA Slave Narratives: ${st}`, "interviewees / FWP fieldworkers", "dialect", "en",
    { startProse: true, notes: `${files.length} volume file(s) grouped by the state named in the text; transcribed interviews 1936-38 in eye-dialect orthography; informant lists and fieldworker headers remain` }));
  specs.mislabelled = mislabelled;
  return specs;
}
export const CRYPTIC = { id: "bk-cryptic", files: ["16-wordplay/guardian-cryptics/guardian-cryptic-clues-1999-2020.txt"], title: "Guardian cryptic crossword clues", author: "61 setters", register: "wordplay", language: "en" };
/** Evaluated but not loaded: below the 20,000-token floor after cleaning and no sibling to merge with (the manifest script rebuilds these to record the measured size). */
export const THIN = [
  book("bk-faustus", "15-western-canon/marlowe/doctor-faustus-1604-quarto.txt", "Doctor Faustus (1604 quarto, Dyce)", "C. Marlowe", "drama", "en", { drama: "marlowe" }),
];
