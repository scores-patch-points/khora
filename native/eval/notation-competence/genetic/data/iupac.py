# iupac.py — export the IUPAC-IUB nucleotide and amino-acid code tables (the giver of the alphabet prior)
# from Biopython 1.88 Bio.Data.IUPACData into gold/iupac.json. No sequence data involved.
import json
from Bio.Data import IUPACData as D
out = {
  "giver": "IUPAC-IUB (NC-IUB 1984 nucleotide codes; IUPAC 1-letter amino-acid codes) as encoded in Biopython 1.88 Bio.Data.IUPACData",
  "ambiguous_dna_values": D.ambiguous_dna_values,
  "ambiguous_rna_values": D.ambiguous_rna_values,
  "protein_letters": D.protein_letters,
  "extended_protein_letters": D.extended_protein_letters,
}
json.dump(out, open("/private/tmp/claude-501/notation/genetic/gold/iupac.json","w"), indent=1, sort_keys=True)
print(out["protein_letters"], out["extended_protein_letters"], sorted(out["ambiguous_dna_values"]))
