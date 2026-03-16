#import <React/RCTEventEmitter.h>
#import "NativeEventEmitterSpec.h"

@interface RCT_EXTERN_REMAP_MODULE(EventEmitter, EventEmitter, RCTEventEmitter<NativeEventEmitterSpec>)
RCT_EXTERN_METHOD(addListener:(NSString *)eventName)
RCT_EXTERN_METHOD(removeListeners:(double)count)
RCT_EXTERN_METHOD(getMostRecentUserActivity:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
