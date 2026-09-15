#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_REMAP_MODULE(SpotlightModule, SpotlightModule, NSObject)
RCT_EXTERN_METHOD(replaceIndex:(NSString *)itemsJSON
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deleteIndex:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(popPendingURL:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(donateActivity:(NSString *)identifier title:(NSString *)title)
RCT_EXTERN_METHOD(clearActivity)
@end
