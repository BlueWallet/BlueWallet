/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <UIKit/UIKit.h>

#import <React/RCTSurfaceDelegate.h>
#import <React/RCTSurfaceSizeMeasureMode.h>
#import <React/RCTSurfaceStage.h>

@class RCTBridge;
@class RCTSurface;

typedef UIView *(^RCTSurfaceHostingViewActivityIndicatorViewFactory)();

NS_ASSUME_NONNULL_BEGIN

/**
 * UIView subclass which providers interoperability between UIKit and
 * Surface regarding layout and life-cycle.
 * This class can be used as easy-to-use general purpose integration point
 * of ReactNative-powered experiences in UIKit based apps.
 */
@interface RCTSurfaceHostingView : UIView <RCTSurfaceDelegate>

/**
 * Designated initializer.
 * Instanciates a view with given Surface object.
 * Note: The view retains the surface object.
 */
- (instancetype)initWithSurface:(RCTSurface *)surface
                sizeMeasureMode:(RCTSurfaceSizeMeasureMode)sizeMeasureMode NS_DESIGNATED_INITIALIZER;

/**
 * Convenience initializer.
 * Instanciates a Surface object with given `bridge`, `moduleName`, and
 * `initialProperties`, and then use it to instanciate a view.
 */
- (instancetype)initWithBridge:(RCTBridge *)bridge
                    moduleName:(NSString *)moduleName
             initialProperties:(NSDictionary *)initialProperties
               sizeMeasureMode:(RCTSurfaceSizeMeasureMode)sizeMeasureMode;

/**
 * Create an instance of RCTSurface to be hosted.
 */
- (RCTSurface *)createSurfaceWithBridge:(RCTBridge *)bridge
                             moduleName:(NSString *)moduleName
                      initialProperties:(NSDictionary *)initialProperties;

/**
 * Surface object which is currently using to power the view.
 * Read-only.
 */
@property (nonatomic, strong, readonly) RCTSurface *surface;

/**
 * Size measure mode which are defining relationship between UIKit and ReactNative
 * layout approaches.
 * Defaults to `RCTSurfaceSizeMeasureModeWidthAtMost | RCTSurfaceSizeMeasureModeHeightAtMost`.
 */
@property (nonatomic, assign) RCTSurfaceSizeMeasureMode sizeMeasureMode;

/**
 * Activity indicator factory.
 * A hosting view may use this block to instantiate and display custom activity
 * (loading) indicator (aka "spinner") when it needed.
 * Defaults to `nil` (no activity indicator).
 */
@property (nonatomic, copy, nullable) RCTSurfaceHostingViewActivityIndicatorViewFactory activityIndicatorViewFactory;

@end

NS_ASSUME_NONNULL_END
