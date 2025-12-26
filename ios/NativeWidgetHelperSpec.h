#import <React/RCTBridgeModule.h>
#import <React/RCTTurboModule.h>

@protocol NativeWidgetHelperSpec <RCTTurboModule>
- (void)reloadAllWidgets;
@end
