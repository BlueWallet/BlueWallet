#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BWHandoff, NSObject)

RCT_EXTERN_METHOD(becomeCurrent:(nonnull NSNumber *)activityId
                  type:(NSString *)type
                  title:(NSString *)title
                  userInfo:(NSDictionary *)userInfo
                  url:(NSString *)url)

RCT_EXTERN_METHOD(invalidate:(nonnull NSNumber *)activityId)

RCT_EXTERN_METHOD(isSupported:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
