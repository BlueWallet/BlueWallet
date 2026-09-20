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
    
    // Required for TurboModule event emitters. Must call super: RCTEventEmitter counts listeners there,
    // and neither startObserving() nor sendEvent() do anything while the count is zero
    override func addListener(_ eventName: String!) {
        super.addListener(eventName)
    }

    override func removeListeners(_ count: Double) {
        super.removeListeners(count)
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
