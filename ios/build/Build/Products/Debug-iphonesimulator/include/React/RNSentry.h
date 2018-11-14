#if __has_include(<React/RCTBridge.h>)
#import <React/RCTBridge.h>
#else
#import "RCTBridge.h"
#endif
#if __has_include(<React/RCTRootView.h>)
#import <React/RCTRootView.h>
#else
#import "RCTRootView.h"
#endif

@interface RNSentry : NSObject <RCTBridgeModule>

+ (void)installWithRootView:(RCTRootView *)rootView;
+ (void)installWithBridge:(RCTBridge *)bridge;

@end
