#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(SizeClassEmitter, RCTEventEmitter)

RCT_EXTERN_METHOD(getCurrentSizeClass:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(emitSizeClassChange:(UIWindow *)window)
RCT_EXTERN_METHOD(sharedInstance)

@end
