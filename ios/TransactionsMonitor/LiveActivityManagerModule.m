// LiveActivityManagerModule.m

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LiveActivityManager, NSObject)

RCT_EXTERN_METHOD(startPersistentLiveActivity)
RCT_EXTERN_METHOD(endPersistentLiveActivity)

@end
