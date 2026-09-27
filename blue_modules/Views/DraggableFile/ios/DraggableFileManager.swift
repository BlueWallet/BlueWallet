import React
import UIKit

@objc(DraggableFileManager)
final class DraggableFileManager: RCTViewManager {
  override class func requiresMainQueueSetup() -> Bool { true }
  override func view() -> UIView! { DraggableFileView() }

  @objc class func propConfig_fileName() -> [String]! { ["NSString"] }
  @objc class func propConfig_mimeType() -> [String]! { ["NSString"] }
  @objc class func propConfig_content() -> [String]! { ["NSString"] }
  @objc class func propConfig_isBase64() -> [String]! { ["BOOL"] }
  @objc class func propConfig_captureViewAsImage() -> [String]! { ["BOOL"] }
}
