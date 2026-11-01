#import <BlueWalletSpec/BlueWalletSpec.h>
#import <React/RCTInvalidating.h>
#import <React-RCTAppDelegate/RCTAppDelegate.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>
#import "BlueWallet-Swift.h"

@interface MenuActionsEmitter : NativeMenuActionsEmitterSpecBase <NativeMenuActionsEmitterSpec, RCTInvalidating>
@end

@implementation MenuActionsEmitter
RCT_EXPORT_MODULE(MenuActionsEmitter)

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
    [MenuActionsController.shared setAvailableActions:actions];
  });
}

- (void)setActionStates:(NSString *)statesJson
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [MenuActionsController.shared setActionStates:statesJson];
  });
}

- (void)setRecentItems:(NSString *)itemsJson
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [MenuActionsController.shared setRecentItems:itemsJson];
  });
}

- (void)setMenuTitles:(NSString *)titlesJson
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [MenuActionsController.shared setMenuTitles:titlesJson];
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
    [MenuActionsController.shared setAvailableActions:@[]];
    [MenuActionsController.shared setActionStates:@"{}"];
    [MenuActionsController.shared setMenuTitles:@"{}"];
    [MenuActionsController.shared setRecentItems:@"[]"];
  });
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeMenuActionsEmitterSpecJSI>(params);
}
@end
