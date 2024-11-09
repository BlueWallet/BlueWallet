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
    return YES;
}

+ (instancetype)sharedInstance {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[self alloc] init];
    });
    return sharedInstance;
}

- (void)removeListeners:(double)count {
  
}

- (instancetype)init {
  self = [super init];
  return self;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onUserActivityOpen"];
}

- (void)sendUserActivity:(NSDictionary *)userInfo
{
  [self sendEventWithName:@"onUserActivityOpen" body:userInfo];
}

RCT_EXPORT_METHOD(getMostRecentUserActivity:(RCTPromiseResolveBlock)resolve
                                 rejecter:(RCTPromiseRejectBlock)reject)
{
    NSUserDefaults *defaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.io.bluewallet.bluewallet"];
    resolve([defaults valueForKey:@"onUserActivityOpen"]);
}

@end
