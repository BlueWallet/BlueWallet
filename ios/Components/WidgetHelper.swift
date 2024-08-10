import WidgetKit

@objc class WidgetHelper: NSObject {
    @objc static func reloadAllWidgets() {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      } else {
        // Fallback on earlier versions
      }
    }
}
