import WidgetKit

@objc protocol NativeWidgetHelperSpec {
  static func moduleName() -> String!
  static func requiresMainQueueSetup() -> Bool
  func reloadAllWidgets()
}

@objc(WidgetHelper)
class WidgetHelper: NSObject, NativeWidgetHelperSpec {
    static func moduleName() -> String! {
        return "WidgetHelper"
    }

    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    func reloadAllWidgets() {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      } else {
        // Fallback on earlier versions
      }
    }
}
