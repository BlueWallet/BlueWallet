//
//  MenuElementsEmitter.m
//  BlueWallet
//

#import "MenuElementsEmitter.h"

static MenuElementsEmitter *sharedInstance;

@implementation MenuElementsEmitter

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

+ (instancetype)sharedInstance {
    if (!sharedInstance) {
        sharedInstance = [[self alloc] init];
    }
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