import Foundation
import React

@objc(EventEmitter)
class EventEmitter: RCTEventEmitter, NativeEventEmitterSpec {
    // React Native creates its own instance of this module, and only that instance is able to send events to JS
    private static weak var sharedInstance: EventEmitter?
    private var hasListeners = false

    override init() {
        super.init()
        EventEmitter.sharedInstance = self
    }

    @objc static func shared() -> EventEmitter? {
        return sharedInstance
    }

    override func supportedEvents() -> [String]! {
        return ["onUserActivityOpen"]
    }

    // Required for TurboModule event emitters. Must call super: RCTEventEmitter counts listeners there,
    // and does not send anything to JS while the count is zero
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

    @objc func sendUserActivity(_ userInfo: [String: Any]) {
        // no listeners yet (e.g. cold start): JS picks the activity up with getMostRecentUserActivity()
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
}
