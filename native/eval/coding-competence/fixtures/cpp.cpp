// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
#include <iostream>
#include "shape.hpp"

namespace geo {

class Shape {
public:
    virtual double area() const = 0;
};

class Circle : public Shape, public Drawable {
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.14159 * r_ * r_; }
private:
    double r_;
};

template <typename T>
T twice(T x) { return x + x; }

}  // namespace geo

double describe(const geo::Shape &s) { return s.area(); }

int main() {
    geo::Circle c(2.0);
    std::cout << describe(c) << geo::twice(3) << std::endl;
    return 0;
}
