// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
package demo;

import java.util.List;
import groovy.json.JsonSlurper;

interface Drawable { void draw(String ctx); }

class Shape {
    double r;
    double area() { return 3.14159 * r * r; }
}

class Circle extends Shape implements Drawable {
    void draw(String ctx) { println(ctx + area()); }
}

def describe(Shape s) { return "area=${s.area()}"; }

def c = new Circle(r: 2.0);
println(describe(c));
