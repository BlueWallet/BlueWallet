#import <React/RCTBridgeModule.h>

@protocol NativeReactNativeContinuitySpec <RCTBridgeModule>
- (void)becomeCurrent:(double)activityId
                 type:(NSString *)type
                title:(NSString * _Nullable)title
             userInfo:(NSDictionary * _Nullable)userInfo
                  url:(NSString * _Nullable)url;
- (void)invalidate:(double)activityId;
- (void)isSupported:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject;
@end
