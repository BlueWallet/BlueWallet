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

// ---------------------------------------------------------------------------------------------
// Experiment-only: logs the current UIKit first responder and scene windows to os_log so CI
// device logs show who owns the keyboard. Not meant to ship.
// ---------------------------------------------------------------------------------------------
#import <React/RCTBridgeModule.h>

static __weak UIResponder *_frProbeResponder = nil;

@interface UIResponder (FRProbe)
- (void)frProbeReport:(id)sender;
@end

@implementation UIResponder (FRProbe)
- (void)frProbeReport:(id)sender
{
  _frProbeResponder = self;
}
@end

static NSString *FRProbeDescribe(void)
{
  _frProbeResponder = nil;
  [[UIApplication sharedApplication] sendAction:@selector(frProbeReport:) to:nil from:nil forEvent:nil];
  UIResponder *responder = _frProbeResponder;
  NSMutableString *description = [NSMutableString new];
  if (responder) {
    [description appendFormat:@"firstResponder=<%@ %p>", NSStringFromClass(responder.class), responder];
    if ([responder isKindOfClass:UIView.class]) {
      UIView *view = (UIView *)responder;
      [description appendFormat:@" responderWindow=%@ superview=%@", view.window ? NSStringFromClass(view.window.class) : @"nil",
                                view.superview ? NSStringFromClass(view.superview.class) : @"nil"];
    }
  } else {
    [description appendString:@"firstResponder=nil"];
  }
  NSMutableArray<NSString *> *windows = [NSMutableArray new];
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class]) {
      continue;
    }
    for (UIWindow *window in ((UIWindowScene *)scene).windows) {
      [windows addObject:[NSString stringWithFormat:@"%@(hidden=%d,key=%d)", NSStringFromClass(window.class), window.hidden, window.isKeyWindow]];
    }
  }
  [description appendFormat:@" sceneWindows=[%@]", [windows componentsJoinedByString:@","]];
  return description;
}

@interface FirstResponderProbe : NSObject <RCTBridgeModule>
@end

@implementation FirstResponderProbe
RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(log : (NSString *)tag)
{
  NSLog(@"[FRProbe] %@ %@", tag, FRProbeDescribe());
}

RCT_EXPORT_METHOD(resign : (NSString *)tag)
{
  NSString *before = FRProbeDescribe();
  BOOL sent = [[UIApplication sharedApplication] sendAction:@selector(resignFirstResponder) to:nil from:nil forEvent:nil];
  NSLog(@"[FRProbe] %@ resign sent=%d before:{%@} after:{%@}", tag, sent, before, FRProbeDescribe());
}
@end
