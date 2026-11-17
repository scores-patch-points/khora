# Deviations from PREREG-GRC.md (each logged with the time it was made; none was made after a result run)

D1 (2026-11-17, before any result run; register derivation only). The prereg's three-condition filter admitted mostly-neuter forms (αὐτό, τό, τὠυτὸ). The English class never binds `it`: a binder binds a named being. A fourth condition was added to the register derivation:
the form's majority gender (among Masc, Fem, Neut in its third-person tokens) must be Masc or Fem. It is a measured property of the form, not a list. P1 and the other predictions are unchanged.

D2 (2026-11-17, before any gold-scored result; found by counting antecedent-id links, not by scoring). Only MATT, MARK, LUKE and JOHN carry antecedent-id links in greek-nt.xml (ACTS, the epistles and REV carry none: 0 links). The prereg's 8 development books (2COR PHILEM ROM 2TIM JUDE HEB 1PET GAL) therefore have
nothing to score: a dev run on them gave 0 answerable pronouns (read, no result about binding). The same sha256 rule is applied to the four gold-bearing books: first by hash = development: JOHN (4ead...); the other three are the untouched gold test: MATT, MARK, LUKE.
P2-P5, P7, P8 are scored on MATT+MARK+LUKE. The gold-free falsifier P6 keeps the prereg's NT test list (all 16 test books, books with fewer than 20 gendered bindings reported as too thin) and Herodotus. The hold-out registers and the hold-out declension prior excluded all 16 books of the prereg test list, which includes JOHN as well as MATT, MARK, LUKE (stricter than needed: JOHN is development).
