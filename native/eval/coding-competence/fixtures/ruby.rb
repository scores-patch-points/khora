# AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
require "json"
require_relative "shape"

module Drawable
  def draw(ctx)
    puts ctx
  end
end

class Shape
  def area
    raise NotImplementedError
  end
end

class Circle < Shape
  include Drawable

  def initialize(r)
    @r = r
  end

  def area
    3.14159 * @r * @r
  end
end

def describe(shape)
  "area=#{shape.area}"
end

c = Circle.new(2.0)
puts describe(c)
