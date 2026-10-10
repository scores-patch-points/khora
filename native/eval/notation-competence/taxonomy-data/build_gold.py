#!/usr/bin/env python3
"""build_gold.py: the GOLD for the taxonomy notation family. Never runs the adapter.

AUTHORITIES (independent of the system under test):
  * Plazi TreatmentBank curators' markup (<taxonomicName> spans + resolved genus/species attributes): WHAT is a name mention and, for
    abbreviated mentions ("W. oblonga"), WHICH taxon it is (the curators resolved the genus from context).
  * gnparser v1.11.1 (Global Names, MIT; the Go library through the venv's `gnparser` wheel): HOW the name string is built: word
    boundaries and word types, canonical form, authorship (original / combination / ex / in authors) and year.
  A span is GOLD only when the two agree (consensus rule below); otherwise it is NEUTRAL: the reader is neither rewarded nor punished
  for what it does inside a neutral span, and the neutral spans are counted by reason (typed gap, never silently dropped).
  gbif_match.py adds the THIRD independent opinion for UNINOMIALS (genus and above): the GBIF Backbone Taxonomy must know the name (matchType EXACT) at a rank
  class (genus-like / higher-like) that agrees with the curators' rank, otherwise the span is NEUTRAL (gbif_no_match / kind_disputed): this removes curator
  mark-up slips such as "Perennials" or "Branchlets" that gnparser parses happily. Species-level mentions have no third opinion (typed: species_unchecked_by_backbone).

CONSENSUS RULE (declared before any reading):
  1. gnparser parsed==true, cardinality in {1,2,3}, quality <= 4.
  2. identity: uninomial -> its word equals one of the span's Plazi attributes (genus/subGenus/family/subFamily/tribe/order/class/phylum/kingdom/...);
     binomial -> (Plazi genus == gn genus, or gn genus is an abbreviation whose letters prefix Plazi genus) and Plazi species == gn epithet;
     trinomial -> additionally Plazi subSpecies/variety/form == gn infraspecific epithet.
  3. TEXT-GROUNDED authorship only: authorship counts when it lies inside the span, or directly after it and equals the Plazi `authority` attribute
     (whitespace/case-insensitive); an authority attribute that is not in the text is ignored.
GOLD ID: genus and above -> the uninomial; species -> "Genus epithet" (genus from the curators' attribute when the text abbreviates it);
infraspecific -> "Genus epithet infraepithet" (subgenus dropped). KIND: genus (Plazi rank genus/subGenus), higher (every other uninomial rank),
species (cardinality 2), infraspecific (cardinality 3).
TOKENS (R1/R2): gnparser words of consensus spans, class mapped GENUS->genus INFRA_GENUS->subgenus SPECIES->epithet INFRASPECIES->infra
UNINOMIAL->uninomial RANK->rank AUTHOR_WORD/_FILIUS->author YEAR/APPROXIMATE_YEAR->year APPROXIMATION_MARKER/COMPARISON_MARKER->marker HYBRID_CHAR->hybrid.
CLAIMS_OK (R4): false when gnparser reports a quality-3+ warning other than "Abbreviated uninomial word" for the span (trailing junk such as "BOR/MOL 15419" or
"Aug M" that gnparser reads as authors); the instrument then ignores the span's authority claims, in both directions (typed gap: claims_unreliable_span).
RELATIONS (R4): genus_of (genus id -> species id), species_of (species id -> infraspecific id), authored_by / recombined_by / ex_author / in_author (name id ->
author key), year_of (name id -> 4-digit year). author key = lowercase letters of the NFKD form with marks removed ("A. J. Paton" = "A.J.Paton" = "ajpaton").
Output: gold/<split>.gold.jsonl.gz {id, mentions:[...]} and gold/<split>.audit.json (counts by reason).
"""
import gzip, json, os, re, sys, unicodedata, collections
import gnparser

ROOT = os.environ.get("TAXONOMY_ROOT", "/private/tmp/claude-501/notation/taxonomy")
CLS = {"GENUS": "genus", "INFRA_GENUS": "subgenus", "SPECIES": "epithet", "INFRASPECIES": "infra", "UNINOMIAL": "uninomial", "RANK": "rank",
       "AUTHOR_WORD": "author", "AUTHOR_WORD_FILIUS": "author", "YEAR": "year", "APPROXIMATE_YEAR": "year", "APPROXIMATION_MARKER": "marker",
       "COMPARISON_MARKER": "marker", "HYBRID_CHAR": "hybrid"}
HIGHER_ATTRS = ["genus", "subGenus", "family", "subFamily", "tribe", "subTribe", "order", "class", "phylum", "kingdom", "superFamily", "subOrder", "superOrder"]
_cache = {}
GBIF = {}
GENUS_LIKE = {"GENUS", "SUBGENUS", "INFRAGENERIC_NAME"}
HIGHER_LIKE = {"FAMILY", "SUBFAMILY", "TRIBE", "SUBTRIBE", "ORDER", "SUBORDER", "SUPERFAMILY", "SUPERORDER", "INFRAORDER", "CLASS", "SUBCLASS", "INFRACLASS", "PHYLUM", "SUBPHYLUM", "KINGDOM", "DIVISION", "SUBDIVISION", "SUPERCLASS", "SUPERPHYLUM", "INFRAFAMILY"}

def gbif_check(word, kind):
    """third opinion for uninomials (None = not consulted). Returns a neutral reason or None."""
    if not GBIF: return None
    r = GBIF.get(word)
    if r is None: return "gbif_unchecked"
    if r.get("matchType") != "EXACT": return "gbif_no_match"
    rk = r.get("rank")
    gk = "genus" if rk in GENUS_LIKE else "higher" if rk in HIGHER_LIKE else None
    if gk != kind: return "kind_disputed"
    return None

def gn(s):
    r = _cache.get(s)
    if r is None:
        r = json.loads(gnparser.parse_to_string(s, "compact"))
        _cache[s] = r
    return r

def akey(s):
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if c.isalpha() and not unicodedata.combining(c)).casefold()

def ws(s): return re.sub(r"\s+", " ", s).strip().casefold()

def ext_end(text, e, authority):
    """extend span end over a directly following authority string equal to the Plazi attribute (text-grounded only)."""
    if not authority: return e
    a = ws(authority)
    if not a: return e
    j = e
    while j < len(text) and text[j] in " \t": j += 1
    seg = text[j:j + len(authority) + 12]
    # compare whitespace-normalised prefix: grow until normalised equals
    for k in range(1, len(seg) + 1):
        if ws(seg[:k]) == a:
            return j + k
        if len(ws(seg[:k])) > len(a): break
    return e

def abbrev_ok(gn_genus, full):
    g = gn_genus.rstrip(".")
    return bool(full) and len(g) >= 1 and full.casefold().startswith(g.casefold()) and (gn_genus.endswith(".") or len(g) <= 2)

def authorship_rel(a):
    """-> (rel, auth): rel = [label, key] items for R4; auth = [label, surface] strings kept so that R5 can RENDER the authority (script-authored sheets)."""
    rel, auth = [], []
    if not a: return rel, auth
    def auth_list(d): return (d or {}).get("authors", []) if d else []
    oa, ca = a.get("originalAuth"), a.get("combinationAuth")
    for x in auth_list(oa): rel.append(["authored_by", akey(x)]); auth.append(["authored_by", x])
    for x in auth_list(ca): rel.append(["recombined_by", akey(x)]); auth.append(["recombined_by", x])
    for d in (oa, ca):
        if d and d.get("exAuthors"):
            for x in d["exAuthors"].get("authors", []): rel.append(["ex_author", akey(x)]); auth.append(["ex_author", x])
        if d and d.get("inAuthors"):
            for x in d["inAuthors"].get("authors", []): rel.append(["in_author", akey(x)]); auth.append(["in_author", x])
    yr = None
    for d in (oa, ca):
        if d and d.get("year") and d["year"].get("year"): yr = d["year"]["year"]; break
        if d and d.get("inAuthors") and d["inAuthors"].get("year"): yr = d["inAuthors"]["year"]["year"]; break
    if yr:
        m = re.match(r"\d{4}", yr)
        if m: rel.append(["year_of", m.group(0)]); auth.append(["year", m.group(0)])
    return [r for r in rel if r[1]], auth

def is_abbrev(g): return g.endswith(".") or len(g) == 1

def resolve_genus(g, pg, ep, inf=None):
    """-> (gold id or None when the abbreviation is not resolved by the curators' attribute, mismatch flag)."""
    tail = f" {ep}" + (f" {inf}" if inf else "")
    if is_abbrev(g):
        if pg: return ((pg + tail), False) if abbrev_ok(g, pg) else (None, True)
        return (None, False)       # pending: resolved at document level (unique-initial rule) in resolve_doc
    if pg and pg != g: return (None, True)
    return (g + tail, False)

def resolve_doc(text, ms):
    """UNIQUE-INITIAL RULE for abbreviated mentions the curators left without a genus attribute: when exactly one distinct full genus of the
    document's GOLD mentions begins with the abbreviation's letter, that is the id (res=doc_unique, causal=True iff that genus was already
    named in full before this mention); several -> ambiguous (id null); none -> none (id null). Neutral for the reader's identity either way."""
    full = []  # (pos, genus)
    for m in ms:
        if m["status"] == "gold" and m["kind"] in ("species", "infraspecific") and m.get("id") and m.get("full_genus"):
            full.append((m["s"], m["id"].split(" ")[0]))
        elif m["status"] == "gold" and m["kind"] == "genus":
            full.append((m["s"], m["id"]))
    for m in ms:
        if m["status"] != "gold" or m.get("id") is not None or m["kind"] not in ("species", "infraspecific"): continue
        g = m["_g"].rstrip(".")
        cands = sorted({gn_ for _, gn_ in full if gn_.casefold().startswith(g.casefold())})
        tail = m["_tail"]
        if len(cands) == 1:
            m["id"] = cands[0] + tail; m["res"] = "doc_unique"
            m["causal_ok"] = any(p < m["s"] and gn_ == cands[0] for p, gn_ in full)
        else:
            m["id"] = None; m["res"] = "ambiguous" if cands else "none"

def mention(text, n):
    s, e = n["s"], n["e"]
    e2 = ext_end(text, e, n.get("authority"))
    seg = text[s:e2]
    out = {"s": s, "e": e2, "plazi": {k: n.get(k) for k in ("rank", "genus", "species", "subSpecies", "variety", "form", "status", "parent", "section") if n.get(k) is not None}}
    if e2 != e: out["authority_extended"] = True
    r = gn(seg)
    if not r.get("parsed") or r.get("cardinality", 0) not in (1, 2, 3) or r.get("quality", 9) > 4:
        # an epithet-only mention ("rufispina WALKER, 1871") is a name the curators tagged; gn cannot read it standing alone
        reason = "epithet_only" if re.match(r"^[a-z]", seg) else ("gn_unparsed" if not r.get("parsed") else "gn_low_quality")
        return dict(out, status="neutral", reason=reason, text=seg[:60])
    card = r["cardinality"]; det = r.get("details") or {}
    words = r.get("words") or []
    pl = n
    if card == 1:
        u = (det.get("uninomial") or {}).get("uninomial")
        if not u or u not in [pl.get(a) for a in HIGHER_ATTRS]:
            return dict(out, status="neutral", reason="identity_mismatch", text=seg[:60])
        gid = u
        kind = "genus" if pl.get("rank") in ("genus", "subGenus") else "higher"
        why = gbif_check(u, kind)
        if why: return dict(out, status="neutral", reason=why, text=seg[:60])
    elif card == 2:
        d = det.get("species") or {}
        g, ep = d.get("genus"), d.get("species")
        pg, ps = pl.get("genus"), pl.get("species")
        if not g or not ep or ps != ep:
            return dict(out, status="neutral", reason="identity_mismatch", text=seg[:60])
        gid, bad = resolve_genus(g, pg, ep)
        if bad: return dict(out, status="neutral", reason="identity_mismatch", text=seg[:60])
        kind = "species"
    else:
        d = det.get("infraspecies") or {}
        g, ep = d.get("genus"), d.get("species")
        inf = (d.get("infraspecies") or [{}])[-1].get("value")
        pg, ps = pl.get("genus"), pl.get("species")
        pi = pl.get("subSpecies") or pl.get("variety") or pl.get("form")
        if not g or not ep or not inf or ps != ep or pi != inf:
            return dict(out, status="neutral", reason="identity_mismatch", text=seg[:60])
        gid, bad = resolve_genus(g, pg, ep, inf)
        if bad: return dict(out, status="neutral", reason="identity_mismatch", text=seg[:60])
        kind = "infraspecific"
    toks = []; unk = set()
    for w in words:
        c = CLS.get(w["wordType"])
        if c is None: unk.add(w["wordType"]); continue
        toks.append([s + w["start"], s + w["end"], c])
    core_cls = [t for t in toks if t[2] in ("genus", "uninomial", "epithet", "infra", "subgenus", "rank", "hybrid")]
    # core = from the first genus/uninomial word to the last epithet/infra/uninomial word
    first = next((t for t in toks if t[2] in ("genus", "uninomial", "hybrid")), None)
    last = None
    for t in toks:
        if t[2] in ("epithet", "infra", "uninomial"): last = t
    core = [first[0], last[1]] if first and last else None
    rel, auth = authorship_rel(r.get("authorship"))
    warns = [w for w in (r.get("qualityWarnings") or []) if w.get("quality", 0) >= 3 and "Abbreviated uninomial" not in w.get("warning", "")]
    m = dict(out, claims_ok=not warns, status="gold", id=gid, kind=kind, core=core, tokens=toks, rel=rel, gn_q=r.get("quality"), gn_canon=r.get("canonical", {}).get("full"), unk=sorted(unk), text=seg[:80], auth=auth)
    m["full_genus"] = card == 1 or not is_abbrev((det.get("species") or det.get("infraspecies") or {}).get("genus") or ".")
    if gid is None:
        dd = (det.get("species") or det.get("infraspecies") or {})
        inf = ((dd.get("infraspecies") or [{}])[-1].get("value")) if card == 3 else None
        m["_g"] = dd.get("genus"); m["_tail"] = f" {dd.get('species')}" + (f" {inf}" if inf else "")
    return m

def main():
    os.makedirs(f"{ROOT}/gold", exist_ok=True)
    gp = f"{ROOT}/raw/gbif_uninomial.json"
    if os.path.exists(gp):
        GBIF.update({k: v for k, v in json.load(open(gp)).items() if v})
        print("GBIF uninomial cache", len(GBIF), flush=True)
    for split in ("train", "dev", "test"):
        src = f"{ROOT}/corpus/{split}.jsonl.gz"
        if not os.path.exists(src): continue
        audit = collections.Counter(); nd = 0
        with gzip.open(src, "rt", encoding="utf8") as f, gzip.open(f"{ROOT}/gold/{split}.gold.jsonl.gz", "wt", encoding="utf8") as out:
            for line in f:
                d = json.loads(line); nd += 1
                ms = []
                last_e = -1
                for n in sorted(d["names"], key=lambda n: (n["s"], -n["e"])):
                    if n["s"] < last_e: audit["overlap_dropped"] += 1; continue
                    m = mention(d["text"], n)
                    last_e = m["e"]
                    ms.append(m)
                ms_done = True
                resolve_doc(d["text"], ms)
                for m in ms:
                    if m["status"] == "gold":
                        if m.get("id") and m["kind"] in ("species", "infraspecific"):
                            parts = m["id"].split(" ")
                            if m["kind"] == "species": m["rel"].append(["genus_of", parts[0] + "|" + m["id"]])
                            else:
                                m["rel"].append(["genus_of", parts[0] + "|" + " ".join(parts[:2])]); m["rel"].append(["species_of", " ".join(parts[:2]) + "|" + m["id"]])
                    m.pop("_g", None); m.pop("_tail", None)
                    audit[m["status"] + ("/" + m["reason"] if m["status"] == "neutral" else "")] += 1
                    if m["status"] == "gold": audit["res/" + (m.get("res") or "attr_or_full")] += 1
                    if m["status"] == "gold": audit["kind/" + m["kind"]] += 1
                out.write(json.dumps({"id": d["id"], "mentions": ms}, ensure_ascii=False) + "\n")
        audit["docs"] = nd
        json.dump(dict(audit), open(f"{ROOT}/gold/{split}.audit.json", "w"), indent=1)
        print(split, dict(audit), flush=True)

if __name__ == "__main__":
    main()
