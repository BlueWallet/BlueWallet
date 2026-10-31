#import <BlueWalletSpec/BlueWalletSpec.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>
#import <React-RCTAppDelegate/RCTAppDelegate.h>
#import "BlueWallet-Swift.h"

@interface WidgetHelperModule : NativeWidgetHelperSpecBase <NativeWidgetHelperSpec>
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

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeWidgetHelperSpecJSI>(params);
}

@end
