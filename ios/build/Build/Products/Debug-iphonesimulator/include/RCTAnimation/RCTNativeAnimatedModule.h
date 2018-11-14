/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTBridgeModule.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

#import "RCTValueAnimatedNode.h"

@interface RCTNativeAnimatedModule : RCTEventEmitter <RCTBridgeModule, RCTValueAnimatedNodeObserver, RCTEventDispatcherObserver, RCTUIManagerObserver>

@end
