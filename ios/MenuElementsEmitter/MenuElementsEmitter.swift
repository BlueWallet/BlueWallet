import Foundation
import React

@objc(MenuElementsEmitter)
class MenuElementsEmitter: RCTEventEmitter {
    private static var _sharedInstance: MenuElementsEmitter?
    
    private var hasListeners = false
    
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
        hasListeners = true
        NSLog("[MenuElements] Swift: Started observing events")
    }
    
    override func stopObserving() {
        hasListeners = false
        NSLog("[MenuElements] Swift: Stopped observing events")
    }
    
    private func safelyEmitEvent(withName name: String) {
        if hasListeners && self.bridge != nil {
            NSLog("[MenuElements] Swift: Emitting event: %@", name)
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.sendEvent(withName: name, body: nil)
            }
        } else {
            NSLog("[MenuElements] Swift: Cannot emit %@ event. %@", name, !hasListeners ? "No listeners" : "Bridge not ready")
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
