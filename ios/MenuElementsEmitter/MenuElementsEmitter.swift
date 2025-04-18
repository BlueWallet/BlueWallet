import Foundation
import React

@objc(MenuElementsEmitter)
class MenuElementsEmitter: RCTEventEmitter {
    
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
    
    override func supportedEvents() -> [String]! {
        return ["openSettings", "addWalletMenuAction", "importWalletMenuAction", "reloadTransactionsMenuAction"]
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return true
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
