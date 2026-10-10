# AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
module Geo

using LinearAlgebra
import Base: show

abstract type Shape end

struct Circle <: Shape
    r::Float64
end

area(c::Circle) = 3.14159 * c.r^2

function describe(s::Shape)
    return "area=$(area(s))"
end

end
println(Geo.describe(Geo.Circle(2.0)))
