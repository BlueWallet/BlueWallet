#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(MenuElementsEmitter, RCTEventEmitter)

RCT_EXTERN_METHOD(openSettings)
RCT_EXTERN_METHOD(addWalletMenuAction)
RCT_EXTERN_METHOD(importWalletMenuAction)
RCT_EXTERN_METHOD(reloadTransactionsMenuAction)
RCT_EXTERN_METHOD(sharedInstance)

@end
