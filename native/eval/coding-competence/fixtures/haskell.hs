-- AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
module Main where

import Data.List (sort)
import qualified Data.Map as M

class Shape a where
  area :: a -> Double

data Circle = Circle Double

instance Shape Circle where
  area (Circle r) = 3.14159 * r * r

type Name = String

describe :: Shape a => a -> String
describe s = "area=" ++ show (area s)

main :: IO ()
main = putStrLn (describe (Circle 2.0))
