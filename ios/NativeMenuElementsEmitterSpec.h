#import <React/RCTBridgeModule.h>

@protocol NativeMenuElementsEmitterSpec <RCTBridgeModule>
- (void)addListener:(NSString *)eventName;
- (void)removeListeners:(double)count;
- (void)openSettings;
- (void)addWalletMenuAction;
- (void)importWalletMenuAction;
- (void)reloadTransactionsMenuAction;
- (void)sharedInstance;
@end
