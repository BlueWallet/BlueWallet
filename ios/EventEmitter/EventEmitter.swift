import Foundation
import React

@objc(EventEmitter)
class EventEmitter: RCTEventEmitter {
    
    static let sharedInstance: EventEmitter = EventEmitter()
    
    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return ["onUserActivityOpen"]
    }
    
    @objc func sendUserActivity(_ userInfo: [String: Any]) {
        guard userInfo is [String: Any] else {
            NSLog("[EventEmitter] Invalid user activity data: \(userInfo)")
            return
        }
        sendEvent(withName: "onUserActivityOpen", body: userInfo)
    }
    
    @objc func getMostRecentUserActivity(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
        let defaults = UserDefaults(suiteName: "group.io.bluewallet.bluewallet")
        resolve(defaults?.value(forKey: "onUserActivityOpen"))
    }
    
    // Optional: Override init if any singleton behavior is needed.
    override init() {
        super.init()
        // ...existing initialization code...
    }
}
