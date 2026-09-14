#import <React/RCTBridgeModule.h>

@protocol NativeSpotlightSpec <RCTBridgeModule>
- (void)replaceIndex:(NSString *)itemsJSON
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject;
- (void)deleteIndex:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject;
@end
