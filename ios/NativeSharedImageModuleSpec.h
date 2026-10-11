#import <React/RCTBridgeModule.h>

// Swift-facing bridge protocol. The generated TurboModule protocol is adopted
// by the Objective-C++ adapter so C++ stays out of the bridging header.
@protocol NativeSharedImageModuleBridgeSpec <RCTBridgeModule>
- (void)decodeImage:(NSString *)base64Image
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject;
- (void)popPendingImage:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject;
@end
