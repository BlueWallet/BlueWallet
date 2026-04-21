#import <React/RCTBridgeModule.h>

NS_ASSUME_NONNULL_BEGIN

@protocol NativeReactNativeContinuitySpec <RCTBridgeModule>
- (void)becomeCurrent:(double)activityId
                 type:(NSString *)type
                title:(nullable NSString *)title
             userInfo:(nullable NSDictionary *)userInfo
                  url:(nullable NSString *)url;
- (void)invalidate:(double)activityId;
- (void)isSupported:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject;
@end

NS_ASSUME_NONNULL_END
