import fs from "node:fs";
const raw = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const i = raw.indexOf("truth universally acknowledged");
const s = raw.slice(Math.max(0, i - 2000), i + 9000);
const eyes = ["felt", "thought", "heard", "knew", "saw", "told", "said", "found", "wished", "believed", "begged", "hoped", "knew"];
const re = new RegExp(`\\b(${eyes.join("|")})\\b\\s+(?:that\\s+)?([A-Z][a-z]+)`, "g");
let n = 0, m;
while ((m = re.exec(s)) && n < 12) { console.log(`  ${m[1]} ${m[2]}…   ::  ${JSON.stringify(s.slice(m.index, m.index + 60))}`); n++; }