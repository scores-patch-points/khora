// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
package main

import (
	"fmt"
	str "strings"
)

type Drawable interface {
	Draw(ctx string)
}

type Shape struct {
	Name string
}

type Circle struct {
	Shape
	r float64
}

func (c *Circle) Area() float64 { return 3.14159 * c.r * c.r }

func describe(s Shape) string { return str.ToUpper(s.Name) }

func main() {
	c := Circle{Shape{"c"}, 2.0}
	fmt.Println(describe(c.Shape), c.Area())
}
