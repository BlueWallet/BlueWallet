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
  @objc class func propConfig_dragEnabled() -> [String]! { ["BOOL"] }
  @objc class func propConfig_dropEnabled() -> [String]! { ["BOOL"] }
  @objc class func propConfig_exportOnDrag() -> [String]! { ["BOOL"] }
  @objc class func propConfig_secureContentExport() -> [String]! { ["BOOL"] }
  @objc class func propConfig_biometricEnabled() -> [String]! { ["BOOL"] }
  @objc class func propConfig_authenticationPrompt() -> [String]! { ["NSString"] }
  @objc class func propConfig_onFileDrop() -> [String]! { ["RCTDirectEventBlock"] }
  @objc class func propConfig_onExportRequested() -> [String]! { ["RCTDirectEventBlock"] }
}
