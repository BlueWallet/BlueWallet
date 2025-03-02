import Foundation
import React

@objc(MenuElementsEmitter)
class MenuElementsEmitter: RCTEventEmitter {
    private static var _sharedInstance: MenuElementsEmitter?
    
    private var hasListeners = false
    private var lastEventTimes: [String: TimeInterval] = [:]
    private let debounceInterval: TimeInterval = 0.3 // 300ms debounce
    
    override init() {
        super.init()
        MenuElementsEmitter._sharedInstance = self
        NSLog("[MenuElements] Swift: Initialized MenuElementsEmitter instance")
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return ["openSettings", "addWalletMenuAction", "importWalletMenuAction", "reloadTransactionsMenuAction"]
    }
    
    @objc static func shared() -> MenuElementsEmitter? {
        return _sharedInstance
    }
    
    override func startObserving() {
        DispatchQueue.main.async { [weak self] in
            self?.hasListeners = true
            NSLog("[MenuElements] Swift: Started observing events")
        }
    }
    
    override func stopObserving() {
        DispatchQueue.main.async { [weak self] in
            self?.hasListeners = false
            NSLog("[MenuElements] Swift: Stopped observing events")
        }
    }
    
    private func isEventThrottled(_ eventName: String) -> Bool {
        let now = Date().timeIntervalSince1970
        if let lastTime = lastEventTimes[eventName], now - lastTime < debounceInterval {
            return true
        }
        lastEventTimes[eventName] = now
        return false
    }
    
    private func safelyEmitEvent(withName name: String) {
        // Skip if we're throttling this event
        if isEventThrottled(name) {
            NSLog("[MenuElements] Swift: Throttled event: %@", name)
            return
        }
        
        // Execute on background thread to prevent blocking UI
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            if self.hasListeners && self.bridge != nil {
                // But dispatch the actual event back to main thread as required by React Native
                DispatchQueue.main.async {
                    NSLog("[MenuElements] Swift: Emitting event: %@", name)
                    self.sendEvent(withName: name, body: nil)
                }
            } else {
                NSLog("[MenuElements] Swift: Cannot emit %@ event. %@", name, !self.hasListeners ? "No listeners" : "Bridge not ready")
            }
        }
    }
    
    @objc func openSettings() {
        NSLog("[MenuElements] Swift: openSettings called")
        safelyEmitEvent(withName: "openSettings")
    }
    
    @objc func addWalletMenuAction() {
        NSLog("[MenuElements] Swift: addWalletMenuAction called")
        safelyEmitEvent(withName: "addWalletMenuAction")
    }
    
    @objc func importWalletMenuAction() {
        NSLog("[MenuElements] Swift: importWalletMenuAction called")
        safelyEmitEvent(withName: "importWalletMenuAction")
    }
    
    @objc func reloadTransactionsMenuAction() {
        NSLog("[MenuElements] Swift: reloadTransactionsMenuAction called")
        safelyEmitEvent(withName: "reloadTransactionsMenuAction")
    }
    
    override func invalidate() {
        NSLog("[MenuElements] Swift: Module invalidated")
        MenuElementsEmitter._sharedInstance = nil
        super.invalidate()
    }
}
