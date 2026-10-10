;; AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
(ns shapes.core
  (:require [clojure.string :as str]
            [clojure.set :refer [union]]))

(defn area [r] (* 3.14159 r r))

(defn describe [r] (str "area=" (area r)))

(def limit 10)

(defprotocol Drawable (draw [this ctx]))

(defrecord Circle [r])
