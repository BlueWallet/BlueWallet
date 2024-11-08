//
//  MenuElementsEmitter.m
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/7/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

#import "MenuElementsEmitter.h"

static MenuElementsEmitter *sharedInstance;

@implementation MenuElementsEmitter

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

- (instancetype)init {
    self = [super init];
    if (self) {
        sharedInstance = self;
    }
    return self;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"openSettings",
        @"addWalletMenuAction",
        @"importWalletMenuAction",
        @"reloadTransactionsMenuAction"
    ];
}

- (void)openSettings {
    [self sendEventWithName:@"openSettings" body:nil];
}

- (void)addWalletMenuAction {
    [self sendEventWithName:@"addWalletMenuAction" body:nil];
}

- (void)importWalletMenuAction {
    [self sendEventWithName:@"importWalletMenuAction" body:nil];
}

- (void)reloadTransactionsMenuAction {
    [self sendEventWithName:@"reloadTransactionsMenuAction" body:nil];
}

@end
