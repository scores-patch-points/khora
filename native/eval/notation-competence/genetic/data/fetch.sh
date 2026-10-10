#!/usr/bin/env bash
# fetch.sh — fetch the genetic-family corpus (NCBI RefSeq via E-utilities; NCBI gc.prt; Rfam FASTA).
# Sleeps between requests (NCBI asks <= 3 req/s w/o key). Idempotent: skips existing non-empty files.
set -u
ROOT=/private/tmp/claude-501/notation/genetic
EU="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
get() { # url out
  local url="$1" out="$2"
  if [ -s "$out" ]; then return 0; fi
  for try in 1 2 3 4; do
    if curl -sf --max-time 300 -o "$out.tmp" "$url"; then
      if [ -s "$out.tmp" ] && ! head -c 200 "$out.tmp" | grep -q -i "<ERROR\|Error:"; then
        gzip -c "$out.tmp" > "$out" && rm -f "$out.tmp"; return 0
      fi
    fi
    sleep $((try*3))
  done
  echo "FAILED $url" >&2; rm -f "$out.tmp"; return 1
}
grep -v '^#' "$ROOT/scripts/accessions.tsv" | cut -f1 | while read -r acc; do
  [ -z "$acc" ] && continue
  get "$EU?db=nuccore&id=$acc&rettype=gbwithparts&retmode=text&tool=khora-notation" "$ROOT/raw/gbk/$acc.gb.gz"; sleep 0.5
  get "$EU?db=nuccore&id=$acc&rettype=fasta&retmode=text&tool=khora-notation" "$ROOT/raw/fasta/$acc.fna.gz"; sleep 0.5
  get "$EU?db=nuccore&id=$acc&rettype=fasta_cds_aa&retmode=text&tool=khora-notation" "$ROOT/raw/cds_aa/$acc.faa.gz"; sleep 0.5
  echo "ok $acc"
done
# the standard itself (NCBI genetic code table file)
[ -s "$ROOT/raw/gc.prt" ] || curl -sf --max-time 60 -o "$ROOT/raw/gc.prt" "https://ftp.ncbi.nlm.nih.gov/entrez/misc/data/gc.prt"
echo done
