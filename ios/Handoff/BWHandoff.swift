import Foundation
import React

@objc(BWHandoff)
class BWHandoff: NSObject {

  private var activities: [Int: NSUserActivity] = [:]

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func becomeCurrent(_ activityId: NSNumber, type: String, title: String?, userInfo: [String: Any]?, url: String?) {
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
    activities[activityId.intValue] = activity
  }

  @objc
  func invalidate(_ activityId: NSNumber) {
    let key = activityId.intValue
    if let activity = activities[key] {
      activity.invalidate()
      activities.removeValue(forKey: key)
    }
  }

  /// Returns whether Handoff is available on this device.
  /// Handoff requires the user to be signed into iCloud.
  @objc
  func isSupported(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let iCloudAvailable = FileManager.default.ubiquityIdentityToken != nil
    resolve(iCloudAvailable)
  }
}
