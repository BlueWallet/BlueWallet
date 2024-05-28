#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>

@interface OrientationManager : RCTEventEmitter <RCTBridgeModule>

+ (BOOL)supportsRegularSizeClass;

@end
