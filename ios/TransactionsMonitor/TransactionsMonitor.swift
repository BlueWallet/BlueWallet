//
//  TransactionsMonitor.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 10/26/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


// TransactionsMonitor.swift

import Foundation
import React

@objc(TransactionsMonitor)
class TransactionsMonitor: NSObject {
    
    private let electrumFetcher: ElectrumFetcherProtocol
    private let keychainManager: KeychainManager
    private let service = "transactionData"
    private let account = "transactions"
    private let externalTxidsKey = "external_txids"
    
    override init() {
        let settings = UserDefaultsGroup.getElectrumSettings()
        let host = settings.host ?? "electrum.blockstream.info"
        let port = settings.port ?? 50002
        let useSSL = settings.sslPort != nil
        self.electrumFetcher = ElectrumFetcher(host: host, port: port, useSSL: useSSL)
        self.keychainManager = KeychainManager.shared
        super.init()
    }
    
    @objc
    func startMonitoringTransactions() {
        Task {
            do {
                let allTxids = try await fetchAllTxids()
                for txid in allTxids {
                    await monitorTransaction(txid: txid)
                }
                print("TransactionsMonitor: Started monitoring \(allTxids.count) transactions.")
            } catch {
                print("TransactionsMonitor: Error fetching txids: \(error.localizedDescription)")
            }
        }
    }
    
    @objc
    func getAllTxIds(_ callback: @escaping RCTResponseSenderBlock) {
        Task {
            do {
                let allTxids = try fetchAllTxidsSync()
                callback([NSNull(), allTxids])
            } catch {
                callback([error.localizedDescription, NSNull()])
            }
        }
    }
    
    @objc
    func addExternalTxId(_ txid: String) {
        Task {
            do {
                try await addExternalTxIdAsync(txid: txid)
                print("TransactionsMonitor: External txid \(txid) added for monitoring.")
            } catch {
                print("TransactionsMonitor: Error adding external txid \(txid): \(error.localizedDescription)")
            }
        }
    }
    
    @objc
    func removeExternalTxId(_ txid: String) {
        Task {
            do {
                try await removeExternalTxIdAsync(txid: txid)
                print("TransactionsMonitor: External txid \(txid) removed from monitoring.")
            } catch {
                print("TransactionsMonitor: Error removing external txid \(txid): \(error.localizedDescription)")
            }
        }
    }
    
    private func addExternalTxIdAsync(txid: String) async throws {
        var externalTxids = try keychainManager.retrieveCodable(service: externalTxidsKey, account: account, type: [String].self) ?? []
        externalTxids.append(txid)
        try keychainManager.saveCodable(object: externalTxids, service: externalTxidsKey, account: account)
        await monitorTransaction(txid: txid)
    }
    
    private func removeExternalTxIdAsync(txid: String) async throws {
        var externalTxids = try keychainManager.retrieveCodable(service: externalTxidsKey, account: account, type: [String].self) ?? []
        if let index = externalTxids.firstIndex(of: txid) {
            externalTxids.remove(at: index)
            try keychainManager.saveCodable(object: externalTxids, service: externalTxidsKey, account: account)
        } else {
            throw NSError(domain: "TransactionsMonitor", code: -1, userInfo: [NSLocalizedDescriptionKey: "Txid not found in external monitoring"])
        }
    }
    
    private func fetchAllTxids() async throws -> [String] {
        var txids: [String] = []
        if let walletTxs = try keychainManager.retrieveCodable(service: service, account: account, type: [Transaction].self) {
            txids += walletTxs.map { $0.txid }
        }
        if let externalTxids = try keychainManager.retrieveCodable(service: externalTxidsKey, account: account, type: [String].self) {
            txids += externalTxids
        }
        return txids
    }
    
    private func fetchAllTxidsSync() throws -> [String] {
        var txids: [String] = []
        if let walletTxs = try keychainManager.retrieveCodable(service: service, account: account, type: [Transaction].self) {
            txids += walletTxs.map { $0.txid }
        }
        if let externalTxids = try keychainManager.retrieveCodable(service: externalTxidsKey, account: account, type: [String].self) {
            txids += externalTxids
        }
        return txids
    }
    
    private func monitorTransaction(txid: String) async {
        do {
            let confirmations = try await electrumFetcher.fetchTransactionConfirmations(txid: txid)
            if confirmations > 0 {
                TransactionsMonitorEventEmitter.sendTransactionConfirmedEvent(txid: txid)
                try await removeExternalTxIdAsync(txid: txid)
            }
        } catch {
            print("TransactionsMonitor: Error monitoring txid \(txid): \(error.localizedDescription)")
        }
    }
}