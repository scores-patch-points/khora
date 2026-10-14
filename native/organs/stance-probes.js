// organs/stance-probes.js — the HUNT PLAN: when a pole of the spectrum is empty, ask for it in the words people use for it.
//
// The user, 2026-10-14: "it doesn't have to say 'oppose'; we may need to agentically go hunt 'who is against? who doesn't like?' etc."
//
// A record that never writes "oppose" about the topic can still hold opposition ("Rounds says he'd have kids going to school in the
// dark", "most Americans dislike …"). readPerspectives (perspectives.js) finds the stances the pages state; this organ says what to
// ASK next for the poles it did not fill. Pure: it returns questions and the reason for each; the runner (callimachus-run.mjs
// --question Q --search N) does the fetching, so every page it brings back is pinned and cited like any other source.
//
//   huntPlan(perspectives, { topic }) → { need: ["+"|"-"], probes: [{ q, pole, frame }], why }
//
// THE FRAME WORDS are declared English question grammar (the user's examples first, then the STANCE_FRAMES lemmas); another language
// declares its own. A pole is "needed" when it holds no NAMED holder (a pronoun or "?" holder is not a holder). Asked-pole
// questions are generated first because that is the pole the asker named.
import { STANCE_FRAMES } from "./perspectives.js";

const CON_FORMS = Object.freeze(["Who is against {t}?", "Who doesn't like {t}?", "Who opposes {t}?", "What are the arguments against {t}?", "Who has criticized {t}?"]);
const PRO_FORMS = Object.freeze(["Who is in favor of {t}?", "Who likes {t}?", "Who supports {t}?", "What are the arguments for {t}?", "Who has praised {t}?"]);

export function probeQuestions(topic, { frames = STANCE_FRAMES } = {}) {
  const t = String(topic).trim();
  if (!t) return [];
  const fromFrames = (lemmas, pole) => lemmas.map((l) => ({ q: `Who would ${l} ${t}?`, pole, frame: l }));
  return [
    ...CON_FORMS.map((f) => ({ q: f.replace("{t}", t), pole: "con", frame: f })),
    ...PRO_FORMS.map((f) => ({ q: f.replace("{t}", t), pole: "pro", frame: f })),
    ...fromFrames(frames.con, "con"),
    ...fromFrames(frames.pro, "pro"),
  ];
}

export function huntPlan(perspectives, { topic, frames = STANCE_FRAMES } = {}) {
  const named = (p) => perspectives.positions.filter((x) => x.pole === p && x.holder && !/^(he|she|they|it|who|we|i|you)$/i.test(x.holder));
  const asked = perspectives.asked && frames.con.includes(perspectives.asked) ? "con" : perspectives.asked && frames.pro.includes(perspectives.asked) ? "pro" : "con";
  const side = { con: asked === "con" ? "+" : "-", pro: asked === "con" ? "-" : "+" };
  const need = ["con", "pro"].filter((k) => named(side[k]).length === 0);
  // the asked pole first
  const order = need.sort((a, b) => (a === asked ? -1 : b === asked ? 1 : 0));
  const probes = order.flatMap((k) => probeQuestions(topic, { frames }).filter((p) => p.pole === k));
  return { need: order.map((k) => side[k]), asked, probes, why: need.length ? `no named holder on the ${order.join(" and ")} pole${order.length > 1 ? "s" : ""}` : "every pole holds a named holder" };
}
