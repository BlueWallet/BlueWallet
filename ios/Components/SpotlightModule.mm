#import <React/RCTBridgeModule.h>
#import "NativeSpotlightSpec.h"

@interface RCT_EXTERN_REMAP_MODULE(SpotlightModule, SpotlightModule, NSObject<NativeSpotlightSpec>)
RCT_EXTERN_METHOD(replaceIndex:(NSString *)itemsJSON
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deleteIndex:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
@end
