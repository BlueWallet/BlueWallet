#import <React/RCTBridgeModule.h>

@protocol NativeWidgetHelperSpec <RCTBridgeModule>
- (void)reloadAllWidgets;
- (void)refreshPendingTransactionsLiveActivity;
@end
