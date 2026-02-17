#import <React/RCTBridgeModule.h>

// Keep this spec light for Swift bridging; avoid TurboModule includes to prevent C++ STL lookup issues during Swift dependency scanning.
@protocol NativeEventEmitterSpec <RCTBridgeModule>
- (void)addListener:(NSString *)eventName;
- (void)removeListeners:(double)count;
- (void)getMostRecentUserActivity:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject;
@end
