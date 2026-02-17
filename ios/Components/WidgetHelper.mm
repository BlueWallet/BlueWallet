#import <React/RCTBridgeModule.h>
#import "NativeWidgetHelperSpec.h"

@interface RCT_EXTERN_REMAP_MODULE(WidgetHelper, WidgetHelperModule, NSObject<NativeWidgetHelperSpec>)
RCT_EXTERN_METHOD(reloadAllWidgets)
@end
