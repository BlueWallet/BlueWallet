/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <UIKit/UIKit.h>
#import <UserNotifications/UserNotifications.h>
@import WatchConnectivity;
@class WatchBridge;

@interface AppDelegate : UIResponder <UIApplicationDelegate, WCSessionDelegate, UNUserNotificationCenterDelegate>

@property (nonatomic, strong) UIWindow *window;
@property(nonatomic, strong) WatchBridge *watchBridge;
@property(nonatomic, strong) WCSession *session;
@property(nonatomic) BOOL didReceiveNotificationInForeground;

@end
