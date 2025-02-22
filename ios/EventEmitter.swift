import Foundation
import React

@objc(EventEmitter)
class EventEmitter: RCTEventEmitter {
    static let sharedInstance = EventEmitter()
    
    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc static func shared() -> EventEmitter {
        return sharedInstance
    }
    
    override func supportedEvents() -> [String]! {
        return ["onUserActivityOpen"]
    }
    
    @objc func sendUserActivity(_ userInfo: [String: Any]) {
        // Removed unnecessary type check; directly sending the event with userInfo.
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
