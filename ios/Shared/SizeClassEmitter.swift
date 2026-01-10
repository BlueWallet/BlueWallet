import Foundation
import UIKit
import React

@objc(SizeClassEmitter)
class SizeClassEmitter: RCTEventEmitter {
  private enum SizeClassValue: Int {
    case compact = 0
    case regular = 1
    case large = 2
  }

  private static var sharedEmitter = SizeClassEmitter()
  private var hasListeners = false

    override init() {
      super.init()
      SizeClassEmitter.sharedEmitter = self
    }

  override class func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    ["sizeClassDidChange"]
  }

  // MARK: - Singleton access used by ObjC bridge

  @objc func sharedInstance() -> SizeClassEmitter {
    SizeClassEmitter.sharedEmitter
  }

  // MARK: - Public API exposed to JS

  @objc func getCurrentSizeClass(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let payload = self.buildPayload(window: nil) else {
        reject("size_class_unavailable", "Unable to read current size class", nil)
        return
      }
      resolve(payload)
    }
  }

  @objc func emitSizeClassChange(_ window: UIWindow?) {
    DispatchQueue.main.async {
      self.sendUpdate(window: window, reason: "manual")
    }
  }

  // MARK: - Listener lifecycle

  override func startObserving() {
    hasListeners = true

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handlePotentialTraitChange),
      name: UIDevice.orientationDidChangeNotification,
      object: nil
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handlePotentialTraitChange),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handlePotentialTraitChange),
      name: UIWindow.didBecomeKeyNotification,
      object: nil
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handlePotentialTraitChange),
      name: UIWindow.didResignKeyNotification,
      object: nil
    )
  }

  override func stopObserving() {
    hasListeners = false
    NotificationCenter.default.removeObserver(self)
  }

  // MARK: - Notification handling

  @objc private func handlePotentialTraitChange() {
    sendUpdate(window: nil, reason: "notification")
  }

  private func sendUpdate(window: UIWindow?, reason: String) {
    guard hasListeners else { return }
    guard let payload = buildPayload(window: window) else { return }

    #if DEBUG
    NSLog("[SizeClassEmitter] Emitting update (%@): %@", reason, payload.description)
    #endif

    sendEvent(withName: "sizeClassDidChange", body: payload)
  }

  // MARK: - Payload construction

  private func buildPayload(window: UIWindow?) -> [String: Any]? {
    guard let activeWindow = resolveWindow(window) else {
      return nil
    }

    let traits = activeWindow.traitCollection
    let bounds = activeWindow.bounds

    let horizontalClass = map(sizeClass: traits.horizontalSizeClass)
    let verticalClass = map(sizeClass: traits.verticalSizeClass)

    // Preserve previous JS behavior: any non-Compact width is considered Large overall.
    let overallClass: SizeClassValue = horizontalClass == .compact ? .compact : .large

    let orientation: String = bounds.width > bounds.height ? "landscape" : "portrait"
    let isLargeScreen = horizontalClass != .compact

    return [
      "horizontal": horizontalClass.rawValue,
      "vertical": verticalClass.rawValue,
      "sizeClass": overallClass.rawValue,
      "orientation": orientation,
      "isLargeScreen": isLargeScreen,
      "width": Double(bounds.width),
      "height": Double(bounds.height),
    ]
  }

  private func map(sizeClass: UIUserInterfaceSizeClass) -> SizeClassValue {
    switch sizeClass {
    case .compact:
      return .compact
    case .regular:
      return .regular
    default:
      return .regular
    }
  }

  private func resolveWindow(_ providedWindow: UIWindow?) -> UIWindow? {
    if let providedWindow {
      return providedWindow
    }

    if let keyWindow = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) {
      return keyWindow
    }

    return UIApplication.shared.windows.first
  }
}
