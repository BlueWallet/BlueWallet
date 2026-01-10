import Foundation
import WidgetKit
#if canImport(React_Codegen)
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

#if canImport(React_Codegen)
@objc(WidgetHelperModule)
class WidgetHelperModule: NSObject, NativeWidgetHelperSpec {
    static func moduleName() -> String! { "WidgetHelper" }
    static func requiresMainQueueSetup() -> Bool { false }

    @objc
    func reloadAllWidgets() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
#else
// Fallback for targets (e.g., widget extension) that do not pull in React codegen modules.
@objc(WidgetHelperModule)
class WidgetHelperModule: NSObject {
    func reloadAllWidgets() {
        // WidgetsExtension does not link the app's WidgetHelper; invoke WidgetKit directly.
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
#endif
