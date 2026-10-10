// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
#import <Foundation/Foundation.h>
#import "Shape.h"

@protocol Drawable
- (void)draw:(NSString *)ctx;
@end

@interface Circle : Shape <Drawable>
@property double r;
- (double)area;
@end

@implementation Circle
- (double)area { return 3.14159 * self.r * self.r; }
- (void)draw:(NSString *)ctx { NSLog(@"%@ %f", ctx, [self area]); }
@end

int main(void) {
    Circle *c = [[Circle alloc] init];
    NSLog(@"%f", [c area]);
    return 0;
}
