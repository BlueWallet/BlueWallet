#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// This macro exposes the Swift class to Objective-C 
@interface RCT_EXTERN_MODULE(MenuElementsEmitter, RCTEventEmitter)

// Expose the Swift method to JS
RCT_EXTERN_METHOD(shared)
RCT_EXTERN_METHOD(openSettings)
RCT_EXTERN_METHOD(addWalletMenuAction)
RCT_EXTERN_METHOD(importWalletMenuAction)
RCT_EXTERN_METHOD(reloadTransactionsMenuAction)
RCT_EXTERN_METHOD(checkListenerStatus)

// Make sure we share the same instance between native UI and JS
+ (BOOL)requiresMainQueueSetup {
  return YES;
}

@end
