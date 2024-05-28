#import "OrientationManager.h"
#import <UIKit/UIKit.h>

@implementation OrientationManager

RCT_EXPORT_MODULE();

- (instancetype)init {
  if (self = [super init]) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleOrientationChange)
                                                 name:UIDeviceOrientationDidChangeNotification
                                               object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"onOrientationChange"];
}

- (void)handleOrientationChange {
  BOOL isRegularSizeClass = [OrientationManager supportsRegularSizeClass];
  [self sendEventWithName:@"onOrientationChange" body:@{@"isLargeScreen": @(isRegularSizeClass)}];
}

RCT_EXPORT_METHOD(getInitialSizeClass:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  BOOL isRegularSizeClass = [OrientationManager supportsRegularSizeClass];
  resolve(@(isRegularSizeClass));
}

+ (BOOL)supportsRegularSizeClass {
  UIWindow *window = [UIApplication sharedApplication].windows.firstObject;
  UIUserInterfaceSizeClass horizontalSizeClass = window.traitCollection.horizontalSizeClass;
  UIUserInterfaceSizeClass verticalSizeClass = window.traitCollection.verticalSizeClass;
  return horizontalSizeClass == UIUserInterfaceSizeClassRegular || verticalSizeClass == UIUserInterfaceSizeClassRegular;
}

@end
