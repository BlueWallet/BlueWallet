import Foundation
import React

@objc(ReactNativeContinuity)
class ReactNativeContinuity: NSObject, NativeReactNativeContinuitySpec {

  static func moduleName() -> String! { "ReactNativeContinuity" }

  private var activities: [Int: NSUserActivity] = [:]

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func becomeCurrent(_ activityId: Double, type: String, title: String?, userInfo: [String: Any]?, url: String?) {
    let id = Int(activityId)
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }

      let activity = NSUserActivity(activityType: type)
      activity.title = title
      activity.isEligibleForHandoff = true

      if let urlString = url, !urlString.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
         let webpageURL = URL(string: urlString) {
        activity.webpageURL = webpageURL
      }
      if let userInfo = userInfo {
        activity.userInfo = userInfo
      }

      activity.becomeCurrent()
      self.activities[id] = activity
    }
  }

  @objc
  func invalidate(_ activityId: Double) {
    let key = Int(activityId)
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      if let activity = self.activities[key] {
        activity.invalidate()
        self.activities.removeValue(forKey: key)
      }
    }
  }

  @objc
  func isSupported(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(FileManager.default.ubiquityIdentityToken != nil)
  }
}
