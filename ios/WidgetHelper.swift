import Foundation
import WidgetKit

class WidgetHelper {
    static func reloadAllWidgets() {
        #if arch(arm64) || arch(i386) || arch(x86_64)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        #endif
    }
    
    static func getSharedUserDefaults() -> UserDefaults? {
        let suiteName = "group.io.bluewallet.bluewallet"
        let defaults = UserDefaults(suiteName: suiteName)
        if defaults == nil {
            NSLog("[WidgetHelper] Warning: Could not access shared UserDefaults")
        }
        return defaults
    }
}
