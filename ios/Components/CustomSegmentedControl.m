//
//  RCT.h
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/22/25.
//  Copyright © 2025 BlueWallet. All rights reserved.
//


#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTUIManager.h>
#import <React/RCTEventDispatcher.h>

@interface RCT_EXTERN_MODULE(CustomSegmentedControlManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(values, NSArray)
RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onChangeEvent, RCTDirectEventBlock)

@end
