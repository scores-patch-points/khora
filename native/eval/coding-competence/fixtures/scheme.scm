;; AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
(import (scheme base) (scheme write))

(define (area r) (* 3.14159 r r))

(define limit 10)

(define (describe r) (display (area r)))

(describe 2.0)
