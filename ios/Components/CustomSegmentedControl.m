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
#import "YourProjectName-Swift.h" // Replace 'YourProjectName' with the actual product module name

@interface RCT_EXTERN_MODULE(CustomSegmentedControlManager, RCTViewManager)

RCT_EXTERN_METHOD(setValues:(nonnull NSNumber *)reactTag values:(NSArray<NSString *> *)values)
RCT_EXTERN_METHOD(setSelectedIndex:(nonnull NSNumber *)reactTag selectedIndex:(nonnull NSNumber *)selectedIndex)

@end