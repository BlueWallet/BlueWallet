#import <BlueWalletSpec/BlueWalletSpec.h>
#import <React/RCTInvalidating.h>
#import <React-RCTAppDelegate/RCTAppDelegate.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>
#import "BlueWallet-Swift.h"

@interface MenuElementsEmitter : NativeMenuElementsEmitterSpecBase <NativeMenuElementsEmitterSpec, RCTInvalidating>
@end

@implementation MenuElementsEmitter
RCT_EXPORT_MODULE(MenuElementsEmitter)

+ (BOOL)requiresMainQueueSetup { return YES; }

- (instancetype)init
{
  if ((self = [super init])) {
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(menuAction:)
                                               name:@"BlueWalletMenuAction" object:nil];
  }
  return self;
}

- (void)setAvailableActions:(NSArray<NSString *> *)actions
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [MenuElementsController.shared setAvailableActions:actions];
  });
}

- (void)menuAction:(NSNotification *)notification
{
  [self emitOnMenuAction:notification.userInfo[@"action"]];
}

- (void)invalidate
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  dispatch_async(dispatch_get_main_queue(), ^{
    [MenuElementsController.shared setAvailableActions:@[]];
  });
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeMenuElementsEmitterSpecJSI>(params);
}
@end
