#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(CustomSegmentedControlManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(values, NSArray)
RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onChangeEvent, RCTDirectEventBlock)

@end
