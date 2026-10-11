import Foundation
import WidgetKit
#if canImport(React)
import React
#endif

// Lightweight helper used by the app target to refresh widget timelines from native code.
class WidgetHelper {
    func reloadAllWidgets() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}

#if canImport(React)
@objc(WidgetHelperImplementation)
class WidgetHelperImplementation: NSObject {
    @objc
    func reloadAllWidgets() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
#else
// Fallback for targets (e.g., widget extension) that do not pull in React modules.
@objc(WidgetHelperModule)
class WidgetHelperModule: NSObject {
    func reloadAllWidgets() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
#endif
