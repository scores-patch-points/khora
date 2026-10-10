// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
package demo

import scala.collection.mutable
import java.util.{List => JList, Map}

trait Drawable { def draw(ctx: String): Unit }

abstract class Shape { def area(): Double }

class Circle(r: Double) extends Shape with Drawable {
  def area(): Double = 3.14159 * r * r
  def draw(ctx: String): Unit = println(ctx + area())
}

object Main {
  def describe(s: Shape): String = "area=" + s.area()
  def main(args: Array[String]): Unit = {
    val c = new Circle(2.0)
    println(describe(c))
  }
}
