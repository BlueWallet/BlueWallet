#import <React/RCTBridgeModule.h>

// Keep the Swift bridging header free of C++ while matching the codegen protocol.
@protocol RCTTurboModule;

@protocol NativeSharedImageModuleSpec <RCTBridgeModule, RCTTurboModule>
- (void)popPendingImage:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject;
@end
