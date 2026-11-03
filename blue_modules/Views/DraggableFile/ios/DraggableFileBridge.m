#import <React/RCTViewManager.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(DraggableFileManager, RCTViewManager)
@end

@interface RCT_EXTERN_MODULE(DragAndDropModule, RCTEventEmitter)
RCT_EXTERN_METHOD(setScreenProtectEnabled:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setFocusedDropConsumer:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
