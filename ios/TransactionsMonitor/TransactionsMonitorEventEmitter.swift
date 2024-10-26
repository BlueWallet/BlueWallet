//
//  TransactionsMonitorEventEmitter.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 10/26/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


// TransactionsMonitorEventEmitter.swift

import Foundation
import React

@objc(TransactionsMonitorEventEmitter)
class TransactionsMonitorEventEmitter: RCTEventEmitter {
    
    static var shared: TransactionsMonitorEventEmitter?
    static var hasListeners = false
    
    override init() {
        super.init()
        TransactionsMonitorEventEmitter.shared = self
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func startObserving() {
        TransactionsMonitorEventEmitter.hasListeners = true
    }

    override func stopObserving() {
        TransactionsMonitorEventEmitter.hasListeners = false
    }
    
    override func supportedEvents() -> [String] {
        return ["TransactionConfirmed"]
    }
    
    static func sendTransactionConfirmedEvent(txid: String) {
        if let emitter = TransactionsMonitorEventEmitter.shared, hasListeners {
            emitter.sendEvent(withName: "TransactionConfirmed", body: ["txid": txid])
        }
    }
}