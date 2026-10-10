// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
package demo;

import java.util.List;
import java.util.Map;

interface Drawable {
    void draw(String ctx);
}

abstract class Shape {
    abstract double area();
}

class Circle extends Shape implements Drawable {
    private final double r;
    Circle(double r) { this.r = r; }
    double area() { return Math.PI * r * r; }
    public void draw(String ctx) { System.out.println(ctx + area()); }
}

public class Main {
    static String describe(Shape s) { return "area=" + s.area(); }
    public static void main(String[] args) {
        Circle c = new Circle(2.0);
        System.out.println(describe(c));
    }
}
