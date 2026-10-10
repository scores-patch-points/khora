<?php
// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
namespace Demo;

use Foo\Bar;
use Foo\Baz as Qux;

require_once "shape.php";

interface Drawable {
    public function draw(string $ctx): void;
}

abstract class Shape {
    abstract public function area(): float;
}

class Circle extends Shape implements Drawable {
    private float $r;
    public function __construct(float $r) { $this->r = $r; }
    public function area(): float { return 3.14159 * $this->r * $this->r; }
    public function draw(string $ctx): void { echo $ctx . $this->area(); }
}

function describe(Shape $s): string { return "area=" . $s->area(); }

$c = new Circle(2.0);
echo describe($c);
