// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
const std = @import("std");

const Point = struct {
    x: i32,
    y: i32,

    pub fn sum(self: Point) i32 {
        return self.x + self.y;
    }
};

fn helper(x: i32) i32 {
    return x * 2;
}

pub fn main() void {
    const p = Point{ .x = 1, .y = 2 };
    std.debug.print("{}\n", .{helper(p.sum())});
}
