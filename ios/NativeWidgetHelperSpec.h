#import <React/RCTBridgeModule.h>

@protocol NativeWidgetHelperSpec <RCTBridgeModule>
- (void)reloadAllWidgets;
- (void)requestLocalNetworkPermission:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)discoverElectrumServers:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
@end
