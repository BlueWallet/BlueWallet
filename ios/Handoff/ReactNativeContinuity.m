#import <React/RCTBridgeModule.h>
#import "NativeReactNativeContinuitySpec.h"

@interface RCT_EXTERN_REMAP_MODULE(ReactNativeContinuity, ReactNativeContinuity, NSObject<NativeReactNativeContinuitySpec>)

RCT_EXTERN_METHOD(becomeCurrent:(double)activityId
                  type:(NSString *)type
                  title:(nullable NSString *)title
                  userInfo:(nullable NSDictionary *)userInfo
                  url:(nullable NSString *)url)

RCT_EXTERN_METHOD(invalidate:(double)activityId)

RCT_EXTERN_METHOD(isSupported:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
