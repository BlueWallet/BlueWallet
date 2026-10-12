#import <BlueWalletSpec/BlueWalletSpec.h>
#import <Foundation/Foundation.h>

@interface LocalNetworkDiscoveryModule : NativeLocalNetworkDiscoverySpecBase <NativeLocalNetworkDiscoverySpec, NSNetServiceBrowserDelegate, NSNetServiceDelegate>
@property(nonatomic, strong) NSMutableArray<NSNetServiceBrowser *> *browsers;
@property(nonatomic, strong) NSMutableSet<NSNetService *> *services;
@property(nonatomic, strong) NSMutableDictionary<NSString *, NSDictionary *> *results;
@property(nonatomic, copy) RCTPromiseResolveBlock pendingResolve;
@property(nonatomic, copy) RCTPromiseRejectBlock pendingReject;
@end

@implementation LocalNetworkDiscoveryModule
RCT_EXPORT_MODULE(LocalNetworkDiscovery)

+ (BOOL)requiresMainQueueSetup { return YES; }

- (void)discoverElectrumServers:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.pendingResolve != nil) {
      reject(@"SCAN_IN_PROGRESS", @"A local network scan is already in progress.", nil);
      return;
    }

    self.pendingResolve = resolve;
    self.pendingReject = reject;
    self.browsers = [NSMutableArray new];
    self.services = [NSMutableSet new];
    self.results = [NSMutableDictionary new];

    for (NSString *type in @[@"_electrum._tcp.", @"_electrums._tcp."]) {
      NSNetServiceBrowser *browser = [NSNetServiceBrowser new];
      browser.delegate = self;
      [self.browsers addObject:browser];
      [browser searchForServicesOfType:type inDomain:@"local."];
    }

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
      [self finishWithResults];
    });
  });
}

- (void)netServiceBrowser:(NSNetServiceBrowser *)browser didFindService:(NSNetService *)service moreComing:(BOOL)moreComing
{
  service.delegate = self;
  [self.services addObject:service];
  [service resolveWithTimeout:3.0];
}

- (void)netServiceDidResolveAddress:(NSNetService *)service
{
  NSString *host = service.hostName;
  if (host.length == 0 || service.port < 1 || service.port > 65535) return;
  BOOL ssl = [service.type isEqualToString:@"_electrums._tcp."];
  NSString *key = [NSString stringWithFormat:@"%@:%ld:%d", host.lowercaseString, (long)service.port, ssl];
  self.results[key] = @{@"host": host, @"port": @(service.port), @"ssl": @(ssl)};
}

- (void)netServiceBrowser:(NSNetServiceBrowser *)browser didNotSearch:(NSDictionary<NSString *, NSNumber *> *)errorDict
{
  if (self.pendingReject == nil) return;
  RCTPromiseRejectBlock reject = self.pendingReject;
  [self clearScan];
  reject(@"PERMISSION_DENIED", @"Local network access is off.", nil);
}

- (void)finishWithResults
{
  if (self.pendingResolve == nil) return;
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  NSArray *results = self.results.allValues;
  [self clearScan];
  resolve(results);
}

- (void)clearScan
{
  for (NSNetServiceBrowser *browser in self.browsers) [browser stop];
  for (NSNetService *service in self.services) [service stop];
  self.browsers = nil;
  self.services = nil;
  self.results = nil;
  self.pendingResolve = nil;
  self.pendingReject = nil;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeLocalNetworkDiscoverySpecJSI>(params);
}

@end
