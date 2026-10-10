// eval/kinds-swarm/ant-shape/extras.mjs — POST-HOC, EXPLORATORY (not in PREREG.md; written after the L1/L3 headline numbers were read; labelled as such in REPORT.md).
// X1 sign of the shadow SIZE per language and in IRC (univariate AUC of log1p(changed), extent.tokens, isNull): do languages disagree on which way size points?
// X2 IRC without the sentence-initial confound: nick tokens are often vocatives at the start of a message; re-run IRC LOFO and UD-eng -> IRC on non-initial tokens only.
// X3 IRC univariate AUC of the rivals.
import fs from "node:fs";
import path from "node:path";
import { ARMS, F, STEMS25, RES, aucOf, buildFolds, foldScores, transferScores, capRows, featAuc, loadLang, loadIrcRows, isInformative, round, mean, seedFor } from "./cvlib.mjs";

const out = {};
const langs = STEMS25.map((s) => loadLang(s, "ud")).filter(isInformative);
const irc = loadIrcRows("irc.json");
const sizeFeats = { logChanged: (r) => F.MAGNITUDE(r)[0], logExtentTokens: (r) => F.MAGNITUDE(r)[1], logExtentFrames: (r) => F.MAGNITUDE(r)[2], isNull: (r) => F.MAGNITUDE(r)[4] };
out.X1 = {};
for (const L of langs) { const y = L.rows.map((r) => r.y); out.X1[L.rows[0].lang] = Object.fromEntries(Object.entries(sizeFeats).map(([k, f]) => [k, round(featAuc(L.rows.map(f), y))])); }
{ const y = irc.rows.map((r) => r.y); out.X1.IRC = Object.fromEntries(Object.entries(sizeFeats).map(([k, f]) => [k, round(featAuc(irc.rows.map(f), y))])); }
const col = (k) => Object.entries(out.X1).filter(([l]) => l !== "IRC").map(([, v]) => v[k]);
out.X1summary = Object.fromEntries(Object.keys(sizeFeats).map((k) => [k, { mean: round(mean(col(k))), nBelow045: col(k).filter((x) => x < 0.45).length, nAbove055: col(k).filter((x) => x > 0.55).length, irc: out.X1.IRC[k] }]));
// X3 + X2
const y = irc.rows.map((r) => r.y);
const rivLabels = ["logWinBefore", "logPrefix", "logGap", "logWinSents", "burst", "logLast16", "logLeftWinFreq", "logRightWinFreq", "leftDiv", "rightDiv", "sameLeft", "sameRight", "sentInitial", "sentFinal", "logSentLen", "logWordLen"];
out.X3_ircRivalUniAuc = Object.fromEntries(rivLabels.map((l, j) => [l, round(featAuc(irc.rows.map((r) => r.rivals[j]), y))]));
const init = irc.rows.filter((r) => r.rivals[12] === 1);
out.X2 = { nInitial: init.length, nonInitial: irc.rows.length - init.length, initialPosShare: round(mean(init.map((r) => r.y))), nonInitialPosShare: round(mean(irc.rows.filter((r) => r.rivals[12] === 0).map((r) => r.y))) };
const sub = irc.rows.filter((r) => r.rivals[12] === 0), ys = sub.map((r) => r.y), bl = sub.map((r) => r.doc);
out.X2.lofo = {};
for (const name of ["FULL", "RIVALS", "SPAN", "SLOT", "C", "SHAPE24", "MAGNITUDE"]) out.X2.lofo[name] = round(aucOf(foldScores(buildFolds(sub, ARMS[name], bl), ys, sub.length), ys));
const eng = loadLang("eng", "ud");
const capped = Object.fromEntries(langs.map((L) => [L.rows[0].lang, capRows(L.rows, 60, seedFor("ant-shape", "cap", L.rows[0].lang))]));
out.X2.transfer = {};
for (const name of ["FULL", "RIVALS", "C", "SPAN", "MAGNITUDE"]) {
  out.X2.transfer[name] = { engToIrcNonInitial: round(aucOf(transferScores(eng.rows, sub, ARMS[name]), ys)), allUdToIrcNonInitial: round(aucOf(transferScores(Object.values(capped).flat(), sub, ARMS[name]), ys)) };
}
fs.writeFileSync(path.join(RES, "extras.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ X1summary: out.X1summary, X2: out.X2, X3: out.X3_ircRivalUniAuc }, null, 1));
