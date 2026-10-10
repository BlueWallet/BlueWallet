#import <BlueWalletSpec/BlueWalletSpec.h>
#import <React/RCTInvalidating.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>
#import <React-RCTAppDelegate/RCTAppDelegate.h>
#import "BlueWallet-Swift.h"

@interface WidgetHelperModule : NativeWidgetHelperSpecBase <NativeWidgetHelperSpec, RCTInvalidating>
@property(nonatomic, strong) WidgetHelperImplementation *implementation;
@end

@implementation WidgetHelperModule
RCT_EXPORT_MODULE(WidgetHelper)

+ (BOOL)requiresMainQueueSetup { return NO; }

- (instancetype)init
{
  if ((self = [super init])) {
    _implementation = [WidgetHelperImplementation new];
  }
  return self;
}

- (void)reloadAllWidgets
{
  [_implementation reloadAllWidgets];
}

- (void)requestLocalNetworkPermission:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_implementation requestLocalNetworkPermission:resolve reject:reject];
}

- (void)discoverElectrumServers:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_implementation discoverElectrumServers:resolve reject:reject];
}

- (void)invalidate
{
  [_implementation invalidate];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeWidgetHelperSpecJSI>(params);
}

@end
