#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import "NativeMenuElementsEmitterSpec.h"

@interface RCT_EXTERN_REMAP_MODULE(MenuElementsEmitter, MenuElementsEmitter, RCTEventEmitter<NativeMenuElementsEmitterSpec>)
RCT_EXTERN_METHOD(addListener:(NSString *)eventName)
RCT_EXTERN_METHOD(removeListeners:(double)count)
RCT_EXTERN_METHOD(openSettings)
RCT_EXTERN_METHOD(addWalletMenuAction)
RCT_EXTERN_METHOD(importWalletMenuAction)
RCT_EXTERN_METHOD(reloadTransactionsMenuAction)
RCT_EXTERN_METHOD(sharedInstance)
@end
