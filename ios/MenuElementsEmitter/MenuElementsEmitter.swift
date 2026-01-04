import Foundation
import React

// Minimal TurboModule spec to avoid relying on generated header when building Swift
@objc protocol NativeMenuElementsEmitterSpec: RCTBridgeModule {
    func addListener(_ eventName: String!)
    func removeListeners(_ count: Double)
    func openSettings()
    func addWalletMenuAction()
    func importWalletMenuAction()
    func reloadTransactionsMenuAction()
}

@objc(MenuElementsEmitter)
class MenuElementsEmitter: RCTEventEmitter, NativeMenuElementsEmitterSpec {
    
    private static var instance: MenuElementsEmitter?
    private var hasListeners = false
    
    override init() {
        super.init()
        MenuElementsEmitter.instance = self
    }
    
    override class func moduleName() -> String! {
        return "MenuElementsEmitter"
    }
    
    @objc
    class func sharedInstance() -> MenuElementsEmitter {
        if instance == nil {
            instance = MenuElementsEmitter()
        }
        return instance!
    }
    
    override func supportedEvents() -> [String]! {
        return ["openSettings", "addWalletMenuAction", "importWalletMenuAction", "reloadTransactionsMenuAction"]
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return true
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
