import Foundation
import React

@objc(MenuElementsEmitter)
class MenuElementsEmitter: RCTEventEmitter {
    // Use a weak reference for the singleton to prevent retain cycles
    private static weak var sharedInstance: MenuElementsEmitter?
    
    // Use LRU cache with a max size to prevent unbounded growth
    private var lastEventTime: [String: TimeInterval] = [:]
    private let throttleInterval: TimeInterval = 0.3 // 300ms throttle
    private let maxCacheSize = 10 // Limit the cache size
    
    // Track listener state without needing constant bridge access
    private var hasListeners = false
    
    override init() {
        super.init()
        MenuElementsEmitter.sharedInstance = self
        NSLog("[MenuElements] MenuElementsEmitter initialized")
    }
    
    deinit {
        NSLog("[MenuElements] MenuElementsEmitter deallocated")
        // Ensure all event listeners are removed in deinit
        self.removeAllListeners()
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return ["openSettings", "addWalletMenuAction", "importWalletMenuAction", "reloadTransactionsMenuAction"]
    }
    
    @objc static func shared() -> MenuElementsEmitter? {
        if sharedInstance == nil {
            NSLog("[MenuElements] Warning: Attempting to use sharedInstance when it's nil")
        }
        return sharedInstance
    }
    
    override func startObserving() {
        hasListeners = true
        NSLog("[MenuElements] Started observing events, bridge: \(self.bridge != nil ? "available" : "unavailable")")
    }
    
    override func stopObserving() {
        hasListeners = false
        NSLog("[MenuElements] Stopped observing events")
        // Clear cache when stopping observation
        lastEventTime.removeAll()
    }
    
    private func limitCacheSize() {
        if lastEventTime.count > maxCacheSize {
            // Remove oldest entries if cache is too large
            let sortedKeys = lastEventTime.sorted(by: { $0.value < $1.value })
            for i in 0..<(lastEventTime.count - maxCacheSize) {
                lastEventTime.removeValue(forKey: sortedKeys[i].key)
            }
        }
    }
    
    private func canEmitEvent(named eventName: String) -> Bool {
        let now = Date().timeIntervalSince1970
        
        if let lastTime = lastEventTime[eventName], now - lastTime < throttleInterval {
            NSLog("[MenuElements] Throttling event: \(eventName)")
            return false
        }
        
        lastEventTime[eventName] = now
        limitCacheSize() // Keep cache size in check
        
        let canEmit = hasListeners && bridge != nil
        if (!canEmit) {
            NSLog("[MenuElements] Cannot emit event: \(eventName), hasListeners: \(hasListeners), bridge: \(bridge != nil ? "available" : "unavailable")")
        }
        
        return canEmit
    }
    
    private func safelyEmitEvent(withName name: String) {
        guard canEmitEvent(named: name) else { return }
        
        NSLog("[MenuElements] Emitting event: \(name)")
        
        // Use weak self to avoid retain cycles
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.bridge != nil, self.hasListeners else { 
                NSLog("[MenuElements] Failed to emit event: \(name) - bridge or listeners not available")
                return
            }
            self.sendEvent(withName: name, body: nil)
            NSLog("[MenuElements] Event sent: \(name)")
        }
    }
    
    func removeAllListeners() {
        NSLog("[MenuElements] Removing all listeners")
        // Clean up resources
        lastEventTime.removeAll()
    }
    
    @objc func openSettings() {
        NSLog("[MenuElements] openSettings method called")
        safelyEmitEvent(withName: "openSettings")
    }
    
    @objc func addWalletMenuAction() {
        NSLog("[MenuElements] addWalletMenuAction method called")
        safelyEmitEvent(withName: "addWalletMenuAction")
    }
    
    @objc func importWalletMenuAction() {
        NSLog("[MenuElements] importWalletMenuAction method called")
        safelyEmitEvent(withName: "importWalletMenuAction")
    }
    
    @objc func reloadTransactionsMenuAction() {
        safelyEmitEvent(withName: "reloadTransactionsMenuAction")
    }
    
    override func invalidate() {
        NSLog("[MenuElements] Module invalidated")
        if MenuElementsEmitter.sharedInstance === self {
            MenuElementsEmitter.sharedInstance = nil
        }
        removeAllListeners()
        super.invalidate()
    }
}
