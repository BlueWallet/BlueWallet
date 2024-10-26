// TransactionsMonitorModule.m

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TransactionsMonitor, NSObject)

RCT_EXTERN_METHOD(startMonitoringTransactions)
RCT_EXTERN_METHOD(getAllTxIds:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(addExternalTxId:(NSString *)txid)
RCT_EXTERN_METHOD(removeExternalTxId:(NSString *)txid)

@end
