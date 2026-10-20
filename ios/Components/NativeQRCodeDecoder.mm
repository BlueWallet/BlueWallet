#import <BlueWalletSpec/BlueWalletSpec.h>
#import "../NativeSharedImageModuleSpec.h"

@protocol SharedImageModuleCombinedSpec <NativeSharedImageModuleBridgeSpec, NativeSharedImageModuleSpec>
@end

@interface RCT_EXTERN_REMAP_MODULE(SharedImageModule, SharedImageModule, NSObject<SharedImageModuleCombinedSpec>)
RCT_EXTERN_METHOD(decodeImage:(NSString *)base64Image
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(popPendingImage:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
@end

@interface SharedImageModule (TurboModule)
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params;
@end

@implementation SharedImageModule (TurboModule)
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeSharedImageModuleSpecJSI>(params);
}
@end
