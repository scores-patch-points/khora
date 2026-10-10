// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
package demo

import kotlin.math.PI
import java.util.List as JList

interface Drawable { fun draw(ctx: String) }

abstract class Shape { abstract fun area(): Double }

class Circle(val r: Double) : Shape(), Drawable {
    override fun area(): Double = PI * r * r
    override fun draw(ctx: String) { println(ctx + area()) }
}

object Util { fun helper(x: Int): Int = x * 2 }

fun describe(s: Shape): String = "area=${s.area()}"

fun main() {
    val c = Circle(2.0)
    println(describe(c))
}
