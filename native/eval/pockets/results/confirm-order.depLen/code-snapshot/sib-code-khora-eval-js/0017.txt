// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
import fs from "node:fs";
import { join as pjoin } from "path";
const os = require("os");

class Shape {
  area() { throw new Error("abstract"); }
}

class Circle extends Shape {
  constructor(r) { super(); this.r = r; }
  area() { return Math.PI * this.r ** 2; }
  static unit() { return new Circle(1); }
}

function describe(shape) {
  return `area=${shape.area().toFixed(2)}`;
}

const helper = (x) => x * 2;

function main() {
  const c = new Circle(2);
  console.log(describe(c), pjoin("a", "b"), helper(3), 0x1f, /ab+c/g, fs, os);
}
main();
