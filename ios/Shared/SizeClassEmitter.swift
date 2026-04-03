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
  private var traitObserverView: TraitObserverView?
  private var keyWindowObserver: NSObjectProtocol?

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
    installTraitObserver()
  }

  override func stopObserving() {
    hasListeners = false
    removeTraitObserver()
  }

  // MARK: - Trait observer

  private func installTraitObserver() {
    DispatchQueue.main.async {
      self.attachObserverToCurrentWindow()

      // Re-attach when the key window changes (multi-window, external display, scene lifecycle).
      if self.keyWindowObserver == nil {
        self.keyWindowObserver = NotificationCenter.default.addObserver(
          forName: UIWindow.didBecomeKeyNotification,
          object: nil,
          queue: .main
        ) { [weak self] notification in
          guard let self = self, self.hasListeners else { return }
          let newWindow = notification.object as? UIWindow
          // Only reattach if the observer is on a different window.
          if let newWindow = newWindow, newWindow !== self.traitObserverView?.superview {
            self.detachObserverView()
            self.attachObserverToCurrentWindow()
            self.sendUpdate(window: newWindow, reason: "keyWindowDidChange")
          }
        }
      }
    }
  }

  private func attachObserverToCurrentWindow() {
    guard self.traitObserverView == nil else { return }
    guard let window = self.resolveWindow(nil) else { return }

    let observer = TraitObserverView { [weak self] in
      self?.sendUpdate(window: nil, reason: "traitCollectionDidChange")
    }
    observer.isHidden = true
    observer.frame = .zero
    window.addSubview(observer)
    self.traitObserverView = observer
  }

  private func detachObserverView() {
    self.traitObserverView?.removeFromSuperview()
    self.traitObserverView = nil
  }

  private func removeTraitObserver() {
    DispatchQueue.main.async {
      self.detachObserverView()
      if let observer = self.keyWindowObserver {
        NotificationCenter.default.removeObserver(observer)
        self.keyWindowObserver = nil
      }
    }
  }

  // MARK: - Event emission

  private func sendUpdate(window: UIWindow?, reason: String) {
    guard hasListeners else { return }
    guard let payload = buildPayload(window: window) else { return }

    #if DEBUG
    NSLog("[SizeClassEmitter] Emitting update (%@): %@", reason, payload.description)
    #endif

    sendEvent(withName: "sizeClassDidChange", body: payload)
  }

  // MARK: - Payload construction from traits

  private func buildPayload(window: UIWindow?) -> [String: Any]? {
    guard let activeWindow = resolveWindow(window) else {
      return nil
    }

    let traits = activeWindow.traitCollection
    let bounds = activeWindow.bounds

    let horizontalClass = map(sizeClass: traits.horizontalSizeClass)
    let verticalClass = map(sizeClass: traits.verticalSizeClass)

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

    if let scene = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .first(where: { $0.activationState == .foregroundActive }),
      let keyWindow = scene.windows.first(where: { $0.isKeyWindow }) ?? scene.windows.first {
      return keyWindow
    }

    return nil
  }
}

// MARK: - Hidden UIView that observes trait collection changes

private class TraitObserverView: UIView {
  private let onChange: () -> Void

  init(onChange: @escaping () -> Void) {
    self.onChange = onChange
    super.init(frame: .zero)
    isUserInteractionEnabled = false
    accessibilityElementsHidden = true
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
    super.traitCollectionDidChange(previousTraitCollection)
    guard traitCollection.horizontalSizeClass != previousTraitCollection?.horizontalSizeClass ||
          traitCollection.verticalSizeClass != previousTraitCollection?.verticalSizeClass else {
      return
    }
    onChange()
  }
}
