// SMOKE TEST of attack-lib.mjs only: does K0 reproduce the confirmer's published numbers on two cells (en_ewt FULL 0.582 [0.528,0.632]; irc-en-fresh FULL 0.915)? NOT a test of any attack.
import { udWindow, ircBase, ircFiles, MAN, occsOf, buildPairs, evalPairs, SPECS, UD_DEFS, IRC_DEFS, rngFor, seedFor, PRE, log } from "./attack-lib.mjs";
const b = udWindow("en_ewt"); log("ud loaded " + b.nTok);
for (const mode of ["FULL"]) { const occs = occsOf(b.P, b.gold, UD_DEFS.PN, mode); const { pairs, dropped } = buildPairs(b.P, occs, SPECS.K0, rngFor(seedFor(PRE, "smoke", "en", mode))); console.log("en_ewt K0", mode, JSON.stringify(evalPairs(b.P, pairs, mode, "smoke", { B: 200, Bperm: 0, name: b.name })), dropped); }
const ir = ircBase("irc-en-fresh", ircFiles(MAN.irc.freshEnAll.map((x) => x.id))); log("irc loaded " + ir.nMsg);
{ const mode = "FULL", occs = occsOf(ir.P, ir.gold, IRC_DEFS.NK, mode); const { pairs, dropped } = buildPairs(ir.P, occs, SPECS.K0, rngFor(seedFor(PRE, "smoke", "irc", mode))); console.log("irc K0", mode, JSON.stringify(evalPairs(ir.P, pairs, mode, "smoke", { B: 200, Bperm: 0, name: ir.name })), dropped); }
