// The real fragments the chat now says it cannot place ("fragment(gap)"), with MY reading of each (the developer's, not gold: rule 7), and a blank column for the
// owner's label. Written so the question "would a giver-backed table for social acts be worth another try?" can be answered from labels that are not mine.
// Needs declared-vs-done.json (node eval/chat-register/declared-vs-done.mjs).   node eval/chat-register/label-fragments.mjs   -> fragments-to-label.tsv, fragments-mine.json
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
// my categories: ack = answer or acknowledgement (yes, no, ok); thanks; greet = greeting or farewell; laugh = laughter or exclamation or emoticons; affection;
// repair = "what?" (asks for a repeat); q = a question; req = a request or command to the person; stmt = a statement; topic = a name, place or word on its own;
// data = bot command, code, link or placeholder; lang = a language the reader has no codec for (Hindi, Tamil, Bengali, Telugu, Malayalam, written in Latin letters)
const mine = {
  "Ru in kaju rum": "lang", "Up to dadar": "stmt", "K d": "ack", "Come": "req", "Ji ha": "lang", "India &lt;#&gt; all out...laxman &lt;#&gt; :)": "stmt", "Thnx same to u": "thanks",
  "Crowd undu huge crowd....but not like season cro": "lang", "Huggggggg uuuuuuuuuu dear.......uuuuummmaaaa": "affection", "Luv u too. 1sec.": "affection", "Kya hua b0l": "lang", "Der": "topic",
  "Oi tui kobe ashbi": "lang", "Itz nt d tim.": "stmt", "Ya sure?": "ack", "0hk tx hv u gt trckng numbr fr dtdc?..": "q", "Gn": "greet", "&lt;R&gt;": "data", "Shal i cal": "q", "Kaha par he": "lang",
  "Sweta bechari ka ek v prnt nahi nikla,mai uski h": "lang", "Avaliyae kaelu!": "lang", "Warden avala apudi dhaan chellama kupiduvanga!": "lang", "Keeriyooodee": "lang",
  "&lt;#&gt; th mari tcs lo join authava": "lang", "Nahaya nai mai": "lang", "Hogaya didi &lt;#&gt; ka": "lang", "Wru": "q", "STATUS 9RA3ZAQC": "data", "Chuma": "lang", "Niche aaja": "lang",
  "U n other girl alone": "stmt", "Nevr..": "ack", "Usb mang": "lang", "E-7CE &lt;#&gt; B &lt;#&gt; C license key": "data", "&lt;DECIMAL&gt; %": "data", "Tats gud..": "ack", "Wah.": "laugh",
  "Moive": "topic", "Mur2 brthday jua kalie gol!": "lang", "Dnt knw?": "stmt", "Ya": "ack", "Wot": "repair", "Bangalore": "topic", "PI": "topic", "Vidhut": "topic",
  "Hahah project meeting ah ??": "laugh", "Tuesday afternoon frisbee (after 1630)": "stmt", "JY": "topic", "Okie": "ack", "*point": "repair", "Me and RC": "stmt", "i not": "stmt", "#imissYilian": "affection",
  "Yun ZI": "topic", "K whatt": "repair", "HAHAHAHHAA": "laugh", "Whutt": "repair", "Wah but": "laugh", "omoooo": "laugh", "Wru lol": "q", "Hahahha": "laugh", "Howw": "q", "Gals": "topic", "Hurryyy": "req",
  "Hahaha ??": "laugh", "our club": "topic", "NOO WHY LIL INDIA": "q", "LHL": "topic", "since lh dw her": "stmt", "Alight from bus": "stmt", "Whywhy": "q", "Yay*": "laugh", "MMK": "ack", "160 messages": "data",
  "HAHAHAHAH": "laugh", "SHHHH": "req", "!3ddesktop": "data", "500 http://us.archive.ubuntu.com intrepid/main": "data", "DBE": "topic", "piratehead: no only from the console": "stmt", "lulu: nope.. not really": "ack",
  "_Sophia_: yes": "ack", "bad joke": "stmt", "root@ubuntu:/home/sean # mount /dev/hdc3": "data", "!flash": "data", "!skype > bob3213243": "data", "ahorner: yes": "ack", "iceroot: http://bashshell.net/file-permissions-a": "data",
  "!google": "data", "staticRails: hi any luck?": "q", "Chaorain: yes": "ack", "Eh?": "repair", "No idea  what that  U in the name is for. ;)": "stmt", "No idea  what that  U in the nameis  for. ;)": "stmt", "!info sl": "data", "people": "topic",
  "most of the time in ENV somewhere": "stmt", "games": "topic", "crshman: sudo dpkg-reconfigure xserver-xorg": "data", "kibbly: yeah.": "ack", "sudo dpkg-reconfigure --force mysql-server": "data", "dev, router or no?": "q",
  "|;-):-*:-D| {[(:-)g)]} {[(:-D貌)]} {[(;-)枚)]} {[(": "laugh",
};
const D = JSON.parse(fs.readFileSync(path.join(HERE, "declared-vs-done.json"), "utf8")), fr = D.rows.filter((r) => r.declared === "fragment");
const rows = fr.map((r) => ({ source: r.source, said: r.said, mine: mine[r.said] ?? mine[r.said.slice(0, 48)] ?? null })), unlabelled = rows.filter((r) => !r.mine);
const count = {}; for (const r of rows) if (r.mine) count[r.mine] = (count[r.mine] ?? 0) + 1;
const social = ["ack", "thanks", "greet", "laugh", "affection"].reduce((a, k) => a + (count[k] ?? 0), 0);
console.log(`${rows.length} fragments the chat could not place (commit ${D.stamp.commit}); my reading:`, JSON.stringify(count), `; unlabelled by me: ${unlabelled.length}`);
console.log(`placeable as a social act or an answer by my reading (ack, thanks, greeting, laughter, affection): ${social} of ${rows.length} (${(social / rows.length * 100).toFixed(0)}%), i.e. ${(social / D.total * 100).toFixed(1)}% of all ${D.total} messages; "what?" repairs: ${count.repair ?? 0}`);
fs.writeFileSync(path.join(HERE, "fragments-to-label.tsv"), "source\tsaid\tmy_guess (developer, not gold)\towner_label\n" + rows.map((r) => `${r.source}\t${r.said.replace(/\t/g, " ")}\t${r.mine ?? ""}\t`).join("\n") + "\n");
fs.writeFileSync(path.join(HERE, "fragments-mine.json"), JSON.stringify({ commit: D.stamp.commit, split: "EXPLORATORY (the labels are the developer's)", total: D.total, fragments: rows.length, count, placeableSocial: social, unlabelled: unlabelled.map((r) => r.said) }, null, 1));
for (const u of unlabelled) console.log("  unlabelled:", JSON.stringify(u.said));
