# AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
library(stats)
require(utils)

area <- function(r) {
  3.14159 * r^2
}

describe <- function(r) paste("area=", area(r))

c1 <- 2.0
print(describe(c1))
