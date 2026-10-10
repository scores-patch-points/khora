-- AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
import Std.Data.HashMap

structure Circle where
  r : Float

class Shape (α : Type) where
  area : α → Float

instance : Shape Circle where
  area c := 3.14159 * c.r * c.r

def describe (c : Circle) : String :=
  s!"area={Shape.area c}"

theorem area_nonneg : True := trivial

def main : IO Unit := IO.println (describe { r := 2.0 })
