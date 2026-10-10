-- AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
local json = require("json")
local Shape = {}
Shape.__index = Shape

function Shape.new(r)
  return setmetatable({ r = r }, Shape)
end

function Shape:area()
  return 3.14159 * self.r * self.r
end

local function describe(s)
  return "area=" .. s:area()
end

local c = Shape.new(2.0)
print(describe(c))
