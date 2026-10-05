#!/bin/bash
# Fetch the HELD-OUT dev and test splits of the same UD treebanks the priors were
# trained on (train only). Gold for the competence card (eval/competence/).
# usage: scripts/fetch-ud-eval.sh <out-dir>
OUT=${1:-/private/tmp/claude-501/ud-eval}
while read stem repo pre; do
  d=$OUT/$stem; mkdir -p $d
  base=https://raw.githubusercontent.com/UniversalDependencies/$repo/master
  for split in dev test; do
    [ -s $d/$split.conllu ] || curl -sSL -m 600 -o $d/$split.conllu $base/$pre-ud-$split.conllu
    # a 404 body is not CoNLL-U
    head -c 200 $d/$split.conllu | grep -q "^# " || { rm -f $d/$split.conllu; }
  done
  echo "$stem dev=$(wc -c < $d/dev.conllu 2>/dev/null || echo none) test=$(wc -c < $d/test.conllu 2>/dev/null || echo none)"
done <<LIST
eng UD_English-EWT en_ewt
spa UD_Spanish-AnCora es_ancora
rus UD_Russian-GSD ru_gsd
cmn UD_Chinese-GSD zh_gsd
cmn-hans UD_Chinese-GSDSimp zh_gsdsimp
arb UD_Arabic-PADT ar_padt
heb UD_Hebrew-HTB he_htb
fas UD_Persian-PerDT fa_perdt
kor UD_Korean-Kaist ko_kaist
jpn UD_Japanese-GSD ja_gsd
fra UD_French-GSD fr_gsd
deu UD_German-GSD de_gsd
ita UD_Italian-ISDT it_isdt
por UD_Portuguese-GSD pt_gsd
nld UD_Dutch-Alpino nl_alpino
pol UD_Polish-PDB pl_pdb
ukr UD_Ukrainian-IU uk_iu
hin UD_Hindi-HDTB hi_hdtb
vie UD_Vietnamese-VTB vi_vtb
ind UD_Indonesian-GSD id_gsd
swe UD_Swedish-Talbanken sv_talbanken
urd UD_Urdu-UDTB ur_udtb
tur UD_Turkish-IMST tr_imst
ell UD_Greek-GDT el_gdt
fin UD_Finnish-TDT fi_tdt
LIST
