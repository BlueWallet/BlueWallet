import Foundation
import React

@objc(EventEmitter)
class EventEmitter: RCTEventEmitter, NativeEventEmitterSpec {
    static let sharedInstance = EventEmitter()
    private var hasListeners = false
    
    @objc static func shared() -> EventEmitter {
        return sharedInstance
    }
    
    override func supportedEvents() -> [String]! {
        return ["onUserActivityOpen"]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }
    
    @objc func sendUserActivity(_ userInfo: [String: Any]) {
        guard hasListeners else { return }
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

    @objc func clearMostRecentUserActivity() {
        UserDefaults(suiteName: "group.io.bluewallet.bluewallet")?.removeObject(forKey: "onUserActivityOpen")
    }
}
