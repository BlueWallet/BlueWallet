import Foundation
import UIKit
import React

@objc(SegmentedControlManager)
final class SegmentedControlManager: RCTViewManager {

  override class func requiresMainQueueSetup() -> Bool { true }

  override func view() -> UIView! {
    return SegmentedControlView()
  }

  @objc class func propConfig_values() -> [String]! { ["NSArray"] }
  @objc class func propConfig_selectedIndex() -> [String]! { ["NSInteger"] }
  @objc class func propConfig_enabled() -> [String]! { ["BOOL"] }
  @objc class func propConfig_momentary() -> [String]! { ["BOOL"] }
  @objc class func propConfig_tintColor() -> [String]! { ["UIColor"] }
  @objc class func propConfig_backgroundColor() -> [String]! { ["UIColor"] }
  @objc class func propConfig_textColor() -> [String]! { ["UIColor"] }
  @objc class func propConfig_onChange() -> [String]! { ["RCTBubblingEventBlock"] }
}

