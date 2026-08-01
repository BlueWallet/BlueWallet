#import <React/RCTBridgeModule.h>

@protocol NativeWidgetHelperSpec <RCTBridgeModule>
- (void)reloadAllWidgets;
- (void)refreshPendingTransactionsLiveActivity;
- (void)previewPendingTransactionsLiveActivity:(double)pendingTransactionCount
                               totalPendingSats:(double)totalPendingSats;
- (void)showcasePendingTransactionsLiveActivity;
@end
