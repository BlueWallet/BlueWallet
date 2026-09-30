import Foundation
import React
import AppIntents

@objc(EventEmitter)
class EventEmitter: RCTEventEmitter, NativeEventEmitterSpec {
    static let sharedInstance = EventEmitter()
    
    @objc static func shared() -> EventEmitter {
        return sharedInstance
    }
    
    override func supportedEvents() -> [String]! {
        return ["onUserActivityOpen"]
    }
    
    override func addListener(_ eventName: String!) {
        // Required for TurboModule event emitters; no-op handled by JS side
    }

    override func removeListeners(_ count: Double) {
        // Required for TurboModule event emitters; no-op handled by JS side
    }
    
    @objc func sendUserActivity(_ userInfo: [String: Any]) {
        sendEvent(withName: "onUserActivityOpen", body: userInfo)
    }
    
    @objc func getMostRecentUserActivity(_ resolve: @escaping RCTPromiseResolveBlock,
                                           rejecter reject: RCTPromiseRejectBlock) {
        if let defaults = UserDefaults(suiteName: "group.io.bluewallet.bluewallet") {
            resolve(defaults.value(forKey: "onUserActivityOpen"))
        } else {
            resolve(nil)
        }
    }

    @objc func updateReceiveAddressShortcutParameters(_ resolve: @escaping RCTPromiseResolveBlock,
                                                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.4, *) {
            WalletAppShortcuts.updateAppShortcutParameters()
        }
        resolve(nil)
    }

    @objc func getReceiveAddressShortcutKeychainAccessGroup(_ resolve: @escaping RCTPromiseResolveBlock,
                                                            rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let accessGroup = Bundle.main.object(forInfoDictionaryKey: "ReceiveAddressShortcutKeychainAccessGroup") as? String,
              !accessGroup.contains("$(AppIdentifierPrefix)") else {
            reject("keychain_access_group_unavailable", "Keychain access group entitlement is unavailable.", nil)
            return
        }
        resolve(accessGroup)
    }
}
