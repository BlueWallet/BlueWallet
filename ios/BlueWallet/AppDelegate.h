/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <UIKit/UIKit.h>
@import WatchConnectivity;
@class WatchBridge;

@interface AppDelegate : UIResponder <UIApplicationDelegate, WCSessionDelegate>

@property (nonatomic, strong) UIWindow *window;
@property(nonatomic, strong) WatchBridge *watchBridge;
@property(nonatomic, strong) WCSession *session;

@end
