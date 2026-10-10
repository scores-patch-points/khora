#lang racket
;; AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
(require racket/list "util.rkt")

(struct shape (r))
(struct circle shape ())

(define (area c) (* 3.14159 (shape-r c) (shape-r c)))
(define limit 10)

(displayln (area (circle 2.0)))
