;; AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
(defpackage :shapes (:use :cl))
(in-package :shapes)

(defclass shape () ((r :initarg :r)))
(defclass circle (shape) ())

(defun area (r) (* 3.14159 r r))

(defmacro twice (x) `(+ ,x ,x))

(defgeneric describe-shape (s))
(defmethod describe-shape ((s circle)) (format t "area=~a" (area 2.0)))

(defvar *limit* 10)
