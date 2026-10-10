// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
use std::collections::HashMap;
use std::fmt;

trait Drawable {
    fn draw(&self, ctx: &str);
}

trait Named: fmt::Debug {
    fn name(&self) -> String;
}

struct Circle {
    r: f64,
}

enum Color { Red, Green }

impl Drawable for Circle {
    fn draw(&self, ctx: &str) { println!("{} {}", ctx, self.area()); }
}

impl Circle {
    fn area(&self) -> f64 { 3.14159 * self.r * self.r }
}

mod util {
    pub fn helper(x: i32) -> i32 { x * 2 }
}

macro_rules! twice {
    ($x:expr) => { $x + $x };
}

fn main() {
    let c = Circle { r: 2.0 };
    let m: HashMap<i32, i32> = HashMap::new();
    c.draw("hi");
    println!("{}", util::helper(3) + twice!(2) + m.len() as i32);
}
