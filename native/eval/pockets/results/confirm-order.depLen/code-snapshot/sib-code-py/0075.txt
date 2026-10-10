#!/usr/bin/env python3
"""derive-gold.py — derive the GOLD for the genetic family with the real authorities.

Authorities (none of them is the system under test):
  * NCBI RefSeq annotation inside the GenBank flat file: CDS locations, /codon_start,
    /transl_table, /translation, /transl_except, pseudo, partial, join (NCBI PGAP / curators).
  * Biopython 1.88 (Bio.SeqIO genbank parser; Bio.Data.CodonTable = NCBI gc.prt as implemented by
    Biopython) as the independent ENGINE: it re-translates every CDS and the result is compared to
    the NCBI /translation (a consistency check on the gold itself, recorded per record).
  * NCBI efetch FASTA (rettype=fasta) cross-checked against the GenBank sequence.

Writes  gold/<acc>.json.gz  and  gold/tables.json  and  manifest.json  under the corpus root.
Never reads anything but the fetched raw files.  No model.
"""
import gzip, json, os, sys, hashlib, datetime
from collections import Counter
from Bio import SeqIO
from Bio.Data import CodonTable
from Bio.SeqFeature import ExactPosition

ROOT = "/private/tmp/claude-501/notation/genetic"
ACC = os.path.join(ROOT, "scripts", "accessions.tsv")

def tables_gold():
    out = {}
    for tid, t in sorted(CodonTable.unambiguous_dna_by_id.items()):
        stops = sorted(t.stop_codons)
        starts = sorted(t.start_codons)
        fwd = dict(t.forward_table)
        tga = "stop" if "TGA" in t.stop_codons else "sense"
        agr = "stop" if ("AGA" in t.stop_codons or "AGG" in t.stop_codons) else "sense"
        taa_tag = "stop" if ("TAA" in t.stop_codons and "TAG" in t.stop_codons) else "other"
        out[str(tid)] = {"id": tid, "names": list(t.names), "stops": stops, "starts": starts,
                         "forward": fwd, "tga": tga, "agr": agr, "core": taa_tag,
                         "stopclass": f"TGA:{tga}|AGR:{agr}"}
    return out

def parse_tsv():
    rows = []
    for line in open(ACC):
        if line.startswith("#") or not line.strip():
            continue
        a, split, group, exp, org = line.rstrip("\n").split("\t")
        rows.append({"acc": a, "split": split, "group": group, "expected_table": int(exp), "organism_short": org})
    return rows

def exact(p):
    return isinstance(p, ExactPosition)

def derive(row, TG):
    acc = row["acc"]
    gb = os.path.join(ROOT, "raw", "gbk", acc + ".gb.gz")
    fa = os.path.join(ROOT, "raw", "fasta", acc + ".fna.gz")
    faa = os.path.join(ROOT, "raw", "cds_aa", acc + ".faa.gz")
    if not (os.path.exists(gb) and os.path.exists(fa)):
        return None
    rec = SeqIO.read(gzip.open(gb, "rt"), "genbank")
    fnarec = SeqIO.read(gzip.open(fa, "rt"), "fasta")
    seq = str(rec.seq).upper()
    L = len(seq)
    fasta_equal = (str(fnarec.seq).upper() == seq)
    gc = (seq.count("G") + seq.count("C")) / max(1, sum(seq.count(x) for x in "ACGT"))
    cds_out, non_cds = [], []
    tab = Counter()
    n_bio_eq = n_bio_checked = 0
    for fi, f in enumerate(rec.features):
        if f.type != "CDS":
            if f.type in ("tRNA", "rRNA", "ncRNA", "tmRNA", "misc_RNA", "gene", "source"):
                if f.type not in ("gene", "source"):
                    non_cds.append({"type": f.type, "start": int(f.location.start), "end": int(f.location.end),
                                    "strand": f.location.strand})
            continue
        q = f.qualifiers
        parts = [{"start": int(p.start), "end": int(p.end), "strand": p.strand} for p in f.location.parts]
        strand = f.location.strand
        partial = any((not exact(p.start)) or (not exact(p.end)) for p in f.location.parts)
        pseudo = ("pseudo" in q) or ("pseudogene" in q)
        tt = int(q.get("transl_table", ["1"])[0])
        tab[tt] += 1
        cs = int(q.get("codon_start", ["1"])[0])
        excs = q.get("transl_except", [])
        slip = ("ribosomal_slippage" in q) or ("exception" in q)
        translation = q.get("translation", [None])[0]
        # monotone along the strand? (a join across the origin of a circular genome is not)
        wraps = False
        if len(parts) > 1:
            seq_order = parts if strand != -1 else list(reversed(parts))
            wraps = any(seq_order[i + 1]["start"] < seq_order[i]["start"] for i in range(len(seq_order) - 1))
        start0, end0 = int(f.location.start), int(f.location.end)
        # extract (strand-normalised) nucleotide sequence of the whole feature
        try:
            nt = str(f.extract(rec.seq)).upper()
        except Exception:
            nt = None
        stop_complete = None
        bio_tr = None
        first_codon = last_codon = None
        if nt and len(nt) >= 3 + (cs - 1):
            body = nt[cs - 1:]
            first_codon = body[:3]
            last_codon = body[-3:] if len(body) >= 3 else None
            stop_complete = bool(last_codon and last_codon in TG[str(tt)]["stops"])
            try:
                tb = CodonTable.unambiguous_dna_by_id[tt]
                if translation and not pseudo and not excs and len(parts) == 1 and len(body) % 3 == 0:
                    n_bio_checked += 1
                    prot = []
                    for i in range(0, len(body) - 3, 3):
                        c = body[i:i + 3]
                        prot.append(tb.forward_table.get(c, "X") if c not in tb.stop_codons else "*")
                    last = body[-3:]
                    if last not in tb.stop_codons:
                        prot.append(tb.forward_table.get(last, "X"))
                    bio = "".join(prot)
                    # initiator codon translates as M at position 1 (NCBI practice)
                    if bio and first_codon in tb.start_codons:
                        bio = "M" + bio[1:]
                    bio_tr = bio
                    if bio == translation:
                        n_bio_eq += 1
            except Exception:
                pass
        cds_out.append({
            "i": len(cds_out), "locus_tag": (q.get("locus_tag") or q.get("gene") or [None])[0],
            "protein_id": (q.get("protein_id") or [None])[0],
            "start": start0, "end": end0, "strand": strand, "parts": parts, "n_parts": len(parts),
            "codon_start": cs, "transl_table": tt, "pseudo": pseudo, "partial": partial, "wraps_origin": wraps,
            "transl_except": excs, "slippage_or_exception": slip,
            "translation": translation, "first_codon": first_codon, "last_codon": last_codon,
            "stop_complete": stop_complete,
            # EVALUABLE as a being (held-out gold for the gene-finding rung): one contiguous interval,
            # complete both ends, not pseudo, with an NCBI translation, no exception.
            "evaluable": bool(len(parts) == 1 and not partial and not pseudo and translation
                              and not excs and not slip and cs == 1 and nt and len(nt) % 3 == 0),
        })
    # majority table of the record
    maj = tab.most_common(1)[0][0] if tab else None
    # protein FASTA (NCBI fasta_cds_aa) vs /translation
    faa_n = faa_match = 0
    if os.path.exists(faa):
        tr_by_pid = {c["protein_id"]: c["translation"] for c in cds_out if c["protein_id"] and c["translation"]}
        try:
            for r in SeqIO.parse(gzip.open(faa, "rt"), "fasta"):
                faa_n += 1
                pid = None
                for tok in r.description.split("["):
                    if tok.startswith("protein_id="):
                        pid = tok.split("=")[1].rstrip("] ")
                if pid and tr_by_pid.get(pid) == str(r.seq):
                    faa_match += 1
        except ValueError:
            faa_n = faa_match = 0  # an empty/non-FASTA protein file (record without CDS features)
    organism = rec.annotations.get("organism")
    gold = {
        "acc": acc, "version": rec.id, "split": row["split"], "group": row["group"],
        "organism": organism, "organism_short": row["organism_short"],
        "definition": rec.description, "length": L, "gc": round(gc, 5), "seq_sha256": hashlib.sha256(seq.encode()).hexdigest(),
        "topology": rec.annotations.get("topology"), "molecule_type": rec.annotations.get("molecule_type"),
        "taxonomy": rec.annotations.get("taxonomy"),
        "table_majority": maj, "tables": {str(k): v for k, v in tab.items()},
        "expected_table": row["expected_table"], "fasta_equals_genbank": fasta_equal,
        "n_cds": len(cds_out), "n_evaluable": sum(1 for c in cds_out if c["evaluable"]),
        "bio_translation_checked": n_bio_checked, "bio_translation_equal": n_bio_eq,
        "protein_fasta_records": faa_n, "protein_fasta_equals_translation": faa_match,
        "cds": cds_out, "non_cds": non_cds,
    }
    return gold

def main():
    TG = tables_gold()
    json.dump(TG, open(os.path.join(ROOT, "gold", "tables.json"), "w"), indent=1, sort_keys=True)
    rows = parse_tsv()
    manifest = {"family": "genetic", "created": datetime.date.today().isoformat(),
                "split_by": "source (one RefSeq genome record = one source; no organism in two splits)",
                "assignment": "declared in scripts/accessions.tsv BEFORE any measurement, stratified by code table x GC x clade",
                "records": [], "missing": []}
    for row in rows:
        g = derive(row, TG)
        if g is None:
            manifest["missing"].append(row["acc"])
            continue
        with gzip.open(os.path.join(ROOT, "gold", row["acc"] + ".json.gz"), "wt") as fh:
            json.dump(g, fh)
        raw_sizes = {k: os.path.getsize(os.path.join(ROOT, "raw", k, row["acc"] + ext))
                     for k, ext in (("gbk", ".gb.gz"), ("fasta", ".fna.gz"), ("cds_aa", ".faa.gz")) if os.path.exists(os.path.join(ROOT, "raw", k, row["acc"] + ext))}
        manifest["records"].append({
            "acc": row["acc"], "split": row["split"], "group": row["group"], "organism": g["organism"],
            "length": g["length"], "gc": g["gc"], "table_majority": g["table_majority"],
            "expected_table": row["expected_table"], "tables": g["tables"],
            "n_cds": g["n_cds"], "n_evaluable": g["n_evaluable"],
            "bio_vs_ncbi_translation": f'{g["bio_translation_equal"]}/{g["bio_translation_checked"]}',
            "protein_fasta_vs_translation": f'{g["protein_fasta_equals_translation"]}/{g["protein_fasta_records"]}',
            "fasta_equals_genbank": g["fasta_equals_genbank"], "raw_gz_bytes": raw_sizes,
        })
        print(row["acc"], row["split"], g["organism_short"], "len", g["length"], "gc", g["gc"], "tables", g["tables"],
              "cds", g["n_cds"], "eval", g["n_evaluable"], "bio==ncbi", f'{g["bio_translation_equal"]}/{g["bio_translation_checked"]}',
              "faa", f'{g["protein_fasta_equals_translation"]}/{g["protein_fasta_records"]}', flush=True)
    json.dump(manifest, open(os.path.join(ROOT, "manifest.json"), "w"), indent=1)

if __name__ == "__main__":
    main()
