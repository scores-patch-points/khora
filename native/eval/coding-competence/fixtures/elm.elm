-- AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
module Shapes exposing (area, describe)

import Html exposing (text)
import List

type Shape = Circle Float | Square Float

type alias Name = String

area : Shape -> Float
area shape =
    case shape of
        Circle r -> 3.14159 * r * r
        Square s -> s * s

describe : Shape -> String
describe s = "area=" ++ String.fromFloat (area s)
