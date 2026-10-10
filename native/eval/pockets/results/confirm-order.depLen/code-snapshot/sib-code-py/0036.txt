# AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
import math
import os.path as osp
from collections import OrderedDict, defaultdict as dd

LIMIT = 10


class Shape:
    """A shape. class Fake: lives only in this docstring."""

    def area(self):
        raise NotImplementedError


class Circle(Shape, Drawable):
    def __init__(self, r: float = 1.0) -> None:
        self.r = r

    def area(self):
        return math.pi * self.r ** 2


def describe(shape):
    return f"area={shape.area():.2f}"


def main():
    c = Circle(2.0)
    print(describe(c), osp.join("a", 'b'))


if __name__ == "__main__":
    main()
