# AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
import strutils, os
from math import sqrt

type
  Shape = ref object of RootObj
    r: float
  Circle = ref object of Shape

proc area(s: Shape): float = 3.14159 * s.r * s.r

func double(x: int): int = x * 2

proc describe(s: Shape): string =
  result = "area=" & $area(s)

let c = Circle(r: 2.0)
echo describe(c)
