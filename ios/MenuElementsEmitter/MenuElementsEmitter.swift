import Foundation
import React

@objc(MenuElementsEmitter)
class MenuElementsEmitter: RCTEventEmitter, NativeMenuElementsEmitterSpec {
    private static var instance: MenuElementsEmitter?
    private var hasListeners = false
    
    override init() {
        super.init()
        MenuElementsEmitter.instance = self
    }
    
    @objc
    class func sharedInstance() -> MenuElementsEmitter {
        if instance == nil {
            instance = MenuElementsEmitter()
        }
        return instance!
    }

    // NativeMenuElementsEmitterSpec expects an instance method; bridge it to the singleton above.
    @objc
    func sharedInstance() {
        _ = MenuElementsEmitter.sharedInstance()
    }
    
    override func supportedEvents() -> [String]! {
        return ["openSettings", "addWalletMenuAction", "importWalletMenuAction", "reloadTransactionsMenuAction"]
    }
    
    override func addListener(_ eventName: String!) {
        // Required for TurboModule event emitters; JS handles bookkeeping
    }

    override func removeListeners(_ count: Double) {
        // Required for TurboModule event emitters; JS handles bookkeeping
    }
    
    override func startObserving() {
        hasListeners = true
    }
    
    override func stopObserving() {
        hasListeners = false
    }
    
    @objc
    func openSettings() {
        if hasListeners {
            sendEvent(withName: "openSettings", body: nil)
        }
    }
    
    @objc
    func addWalletMenuAction() {
        if hasListeners {
            sendEvent(withName: "addWalletMenuAction", body: nil)
        }
    }
    
    @objc
    func importWalletMenuAction() {
        if hasListeners {
            sendEvent(withName: "importWalletMenuAction", body: nil)
        }
    }
    
    @objc
    func reloadTransactionsMenuAction() {
        if hasListeners {
            sendEvent(withName: "reloadTransactionsMenuAction", body: nil)
        }
    }
}
