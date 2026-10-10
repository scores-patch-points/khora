// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
import Foundation
import UIKit

protocol Drawable {
    func draw(ctx: String)
}

class Shape {
    func area() -> Double { return 0 }
}

class Circle: Shape, Drawable {
    let r: Double
    init(r: Double) { self.r = r }
    override func area() -> Double { return 3.14159 * r * r }
    func draw(ctx: String) { print(ctx, area()) }
}

struct Point { var x: Int; var y: Int }

enum Color { case red, green }

func describe(_ s: Shape) -> String { return "area=\(s.area())" }

let c = Circle(r: 2.0)
print(describe(c))
