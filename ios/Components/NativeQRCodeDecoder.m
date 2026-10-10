#import "../NativeSharedImageModuleSpec.h"

@interface RCT_EXTERN_REMAP_MODULE(SharedImageModule, SharedImageModule, NSObject<NativeSharedImageModuleSpec>)
RCT_EXTERN_METHOD(popPendingImage:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
@end
