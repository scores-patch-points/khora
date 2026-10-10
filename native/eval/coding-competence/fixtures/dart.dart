// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
import 'dart:math';
import 'package:flutter/material.dart';

abstract class Shape {
  double area();
}

mixin Drawable { void draw(String ctx) {} }

class Circle extends Shape with Drawable implements Comparable<Circle> {
  final double r;
  Circle(this.r);
  double area() => pi * r * r;
}

String describe(Shape s) => 'area=${s.area()}';

void main() {
  var c = Circle(2.0);
  print(describe(c));
}
