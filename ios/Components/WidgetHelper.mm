#import <React/RCTBridgeModule.h>
#import "NativeWidgetHelperSpec.h"

@interface RCT_EXTERN_REMAP_MODULE(WidgetHelper, WidgetHelperModule, NSObject<NativeWidgetHelperSpec>)
RCT_EXTERN_METHOD(reloadAllWidgets)
RCT_EXTERN_METHOD(requestLocalNetworkPermission:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(discoverElectrumServers:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
