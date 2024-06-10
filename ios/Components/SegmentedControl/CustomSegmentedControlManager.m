#import "CustomSegmentedControlManager.h"
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import <React/UIView+React.h>

@interface CustomSegmentedControl : UISegmentedControl
@property (nonatomic, copy) RCTDirectEventBlock onChangeEvent;
- (void)setValues:(NSArray<NSString *> *)values;
- (void)setSelectedIndex:(NSNumber *)selectedIndex;
@end

@implementation CustomSegmentedControl

- (instancetype)initWithFrame:(CGRect)frame {
  self = [super initWithFrame:frame];
  if (self) {
    [self addTarget:self action:@selector(onChange:) forControlEvents:UIControlEventValueChanged];
  }
  return self;
}

- (void)setValues:(NSArray<NSString *> *)values {
  [self removeAllSegments];
  for (NSUInteger i = 0; i < values.count; i++) {
    [self insertSegmentWithTitle:values[i] atIndex:i animated:NO];
  }
}

- (void)setSelectedIndex:(NSNumber *)selectedIndex {
  self.selectedSegmentIndex = selectedIndex.integerValue;
}

- (void)onChange:(UISegmentedControl *)sender {
  if (self.onChangeEvent) {
    self.onChangeEvent(@{@"selectedIndex": @(self.selectedSegmentIndex)});
  }
}

@end

@implementation CustomSegmentedControlManager

static BOOL isRegistered = NO;

RCT_EXPORT_MODULE(CustomSegmentedControl)

- (UIView *)view {
  return [CustomSegmentedControl new];
}

RCT_EXPORT_VIEW_PROPERTY(values, NSArray)
RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onChangeEvent, RCTDirectEventBlock)

+ (void)registerIfNecessary {
  if (!isRegistered) {
    isRegistered = YES;
    // Registration logic if necessary
  }
}

@end
