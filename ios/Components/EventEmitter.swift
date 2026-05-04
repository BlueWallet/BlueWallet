import Foundation
import React

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
}
