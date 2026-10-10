// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
using System;
using System.Collections.Generic;

namespace Demo
{
    interface IDrawable { void Draw(string ctx); }

    abstract class Shape { public abstract double Area(); }

    class Circle : Shape, IDrawable
    {
        private readonly double r;
        public Circle(double r) { this.r = r; }
        public override double Area() { return Math.PI * r * r; }
        public void Draw(string ctx) { Console.WriteLine(ctx + Area()); }
    }

    class Program
    {
        static string Describe(Shape s) { return "area=" + s.Area(); }
        static void Main(string[] args)
        {
            var c = new Circle(2.0);
            Console.WriteLine(Describe(c));
        }
    }
}
