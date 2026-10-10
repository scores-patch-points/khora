// loaders/_sibling-py.mjs — NEW Python pocket for the sibling replication of fig.introRight: the Python packages installed in the virtualenv of the-fold/scripts/pii (third-party libraries: numpy, pydantic, rich, jinja2, spaCy code, ...).
// Not a pocket of any atlas corpus (exact-bytes dedupe against the code-corpus Python/JS/TS/HTML/Bash files and ethos 09-source-code). Library DATA modules (phonenumbers: geodata/carrier tables; spaCy lang: word and exception lists; the model package) are excluded by location,
// because they are tables written as Python, not programs; no statistic was computed on any file when this choice was made.
import { REPOS, walk, dedupe, codePocket } from "./_sibling-common.mjs";

const ROOT = `${REPOS}/the-fold/scripts/pii/.venv/lib/python3.12/site-packages`;
const SKIP = /(^|\/)(__pycache__|phonenumbers|en_core_web_lg|_vendor)(\/|$)|(^|\/)spacy\/lang(\/|$)|\.dist-info(\/|$)/;
export const IDS = ["sib-py-foldvenv"];
let _c = null;
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(IDS[0])) return [];
  if (!_c) { const all = walk(ROOT, (rel) => SKIP.test(rel), [".py"]); _c = { all: all.length, ...dedupe(all) }; }
  return [codePocket({ id: IDS[0], language: "x-python", files: _c.keep, source: `${ROOT} *.py (${_c.all} files walked; ${_c.keep.length} unique candidates)`,
    notes: `vendored third-party Python (pip packages installed for the-fold's PII scripts; library code with long English docstrings); dedupe drops ${JSON.stringify(_c.dropped)}; excluded by location: phonenumbers, spacy/lang, en_core_web_lg, _vendor copies, dist-info` })];
}
