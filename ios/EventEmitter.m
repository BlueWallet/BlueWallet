//
//  EventEmitter.m
//  BlueWallet
//
//  Created by Marcos Rodriguez on 12/25/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

#import "EventEmitter.h"

static EventEmitter *sharedInstance;

@implementation EventEmitter

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

+ (EventEmitter *)sharedInstance {
    return sharedInstance;
}

- (void)removeListeners:(double)count {
  
}

- (instancetype)init {
    sharedInstance = [super init];
    return sharedInstance;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onNotificationReceived",@"openSettings",@"onUserActivityOpen"];
}

- (void)sendNotification:(NSDictionary *)userInfo
{
  [sharedInstance sendEventWithName:@"onNotificationReceived" body:userInfo];
}

- (void)sendUserActivity:(NSDictionary *)userInfo
{
  [sharedInstance sendEventWithName:@"onUserActivityOpen" body:userInfo];
}

RCT_REMAP_METHOD(getMostRecentUserActivity, resolve: (RCTPromiseResolveBlock)resolve
     reject:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *defaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.io.bluewallet.bluewallet"];
  resolve([defaults valueForKey:@"onUserActivityOpen"]);
}


- (void)openSettings
{
  [sharedInstance sendEventWithName:@"openSettings" body:nil];
}


@end
