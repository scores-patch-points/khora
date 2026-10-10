// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
import { join } from "path";
import type { Readable } from "stream";

interface Drawable {
  draw(ctx: string): void;
}

type Point = { x: number; y: number };

enum Color { Red, Green }

abstract class Shape {
  abstract area(): number;
}

class Circle extends Shape implements Drawable {
  constructor(private r: number) { super(); }
  area(): number { return Math.PI * this.r ** 2; }
  draw(ctx: string): void { console.log(ctx, join("a", "b")); }
}

function describe(shape: Shape): string {
  return `area=${shape.area().toFixed(2)}`;
}

export function main(): void {
  const c = new Circle(2);
  console.log(describe(c), Color.Red);
}
