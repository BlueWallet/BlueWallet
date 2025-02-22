import Foundation
import React

@objc(MenuElementsEmitter)
class MenuElementsEmitter: RCTEventEmitter {

    static let sharedInstance: MenuElementsEmitter = MenuElementsEmitter()

    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return ["openSettings", "addWalletMenuAction", "importWalletMenuAction", "reloadTransactionsMenuAction"]
    }
    
    @objc func openSettings() {
        sendEvent(withName: "openSettings", body: nil)
    }
    
    @objc func addWalletMenuAction() {
        sendEvent(withName: "addWalletMenuAction", body: nil)
    }
    
    @objc func importWalletMenuAction() {
        sendEvent(withName: "importWalletMenuAction", body: nil)
    }
    
    @objc func reloadTransactionsMenuAction() {
        sendEvent(withName: "reloadTransactionsMenuAction", body: nil)
    }
}
