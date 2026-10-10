// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
#include <stdio.h>
#include "shape.h"

#define LIMIT 10
#define SQUARE(x) ((x) * (x))

typedef struct Circle {
    double r;
} Circle;

enum Color { RED, GREEN };

double area(const Circle *c);

double area(const Circle *c) {
    return 3.14159 * c->r * c->r;
}

static int helper(int x) { return SQUARE(x); }

int main(void) {
    Circle c = { 2.0 };
    printf("area=%f %d\n", area(&c), helper(3));
    return 0;
}
