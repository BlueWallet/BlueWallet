#import <BlueWalletSpec/BlueWalletSpec.h>
#import <Network/Network.h>
#import <React-RCTAppDelegate/RCTAppDelegate.h>

@interface LocalNetworkPermission : NativeLocalNetworkPermissionSpecBase <NativeLocalNetworkPermissionSpec>
@property(nonatomic, strong) dispatch_queue_t permissionQueue;
@property(nonatomic, strong) nw_browser_t browser;
@end

@implementation LocalNetworkPermission
RCT_EXPORT_MODULE(LocalNetworkPermission)

+ (BOOL)requiresMainQueueSetup { return NO; }

- (instancetype)init
{
  if ((self = [super init])) {
    _permissionQueue = dispatch_queue_create("io.bluewallet.local-network-permission", DISPATCH_QUEUE_SERIAL);
  }
  return self;
}

- (void)requestLocalNetworkAccess:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(_permissionQueue, ^{
    if (self.browser != nil) {
      resolve(@NO);
      return;
    }

    nw_browse_descriptor_t descriptor = nw_browse_descriptor_create_bonjour_service("_bluewallet-permission._tcp", NULL);
    nw_parameters_t parameters = nw_parameters_create();
    nw_browser_t browser = nw_browser_create(descriptor, parameters);
    if (browser == nil) {
      reject(@"local_network_unavailable", @"Unable to create the Local Network permission request.", nil);
      return;
    }

    self.browser = browser;
    __block BOOL completed = NO;
    void (^finish)(BOOL) = ^(BOOL allowed) {
      if (completed) return;
      completed = YES;
      nw_browser_cancel(browser);
      self.browser = nil;
      resolve(@(allowed));
    };

    nw_browser_set_queue(browser, self.permissionQueue);
    nw_browser_set_state_changed_handler(browser, ^(nw_browser_state_t state, nw_error_t error) {
      switch (state) {
        case nw_browser_state_ready:
          finish(YES);
          break;
        case nw_browser_state_failed:
        case nw_browser_state_cancelled:
          finish(NO);
          break;
        default:
          break;
      }
    });
    nw_browser_start(browser);

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 30 * NSEC_PER_SEC), self.permissionQueue, ^{
      finish(NO);
    });
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeLocalNetworkPermissionSpecJSI>(params);
}

@end
