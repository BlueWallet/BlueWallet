#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ReactNativeContinuity, NSObject)

RCT_EXTERN_METHOD(becomeCurrent:(nonnull NSNumber *)activityId
                  type:(NSString *)type
                  title:(nullable NSString *)title
                  userInfo:(nullable NSDictionary *)userInfo
                  url:(nullable NSString *)url)

RCT_EXTERN_METHOD(invalidate:(nonnull NSNumber *)activityId)

RCT_EXTERN_METHOD(isSupported:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
