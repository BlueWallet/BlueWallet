//
//  WatchDataSource.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/20/19.
//

import Foundation
import WatchConnectivity

class WatchDataSource: NSObject {
    
    struct NotificationName {
        static let dataUpdated = Notification.Name(rawValue: "Notification.WalletDataSource.Updated")
    }
    
    struct Notifications {
        static let dataUpdated = Notification(name: NotificationName.dataUpdated)
    }
    
    static let shared = WatchDataSource()
    var wallets: [Wallet] = [Wallet]()
    static let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
    
    // Use a constant for the keychain identifier
    private static let walletKeychainIdentifier = "WalletKeychainData"

    override init() {
        super.init()
        loadWalletsData()
    }
    
    // Load wallet data from Keychain or other secure storage using Codable
    func loadWalletsData() {
        if let existingData = KeychainManager.shared.getData(forKey: WatchDataSource.walletKeychainIdentifier) {  // Use a static key
            do {
                let walletData = try JSONDecoder().decode([Wallet].self, from: existingData)
                wallets = walletData
                WatchDataSource.postDataUpdatedNotification()
            } catch {
                print("Failed to decode wallets from Keychain: \(error)")
            }
        } else {
            print("No data found in Keychain")
        }
    }
    
    // Process wallet data received from the iPhone app via WatchConnectivity
    func processWalletsData(walletsInfo: [String: Any]) {
        if let walletsToProcess = walletsInfo["wallets"] as? [[String: Any]] {
            wallets.removeAll()
            
            for (index, entry) in walletsToProcess.enumerated() {
                guard let label = entry["label"] as? String,
                      let balance = entry["balance"] as? String,
                      let type = entry["type"] as? String,
                      let preferredBalanceUnit = entry["preferredBalanceUnit"] as? String,
                      let transactions = entry["transactions"] as? [[String: Any]] else {
                    print("Invalid wallet data")
                    continue
                }
                
                var transactionsProcessed = [Transaction]()
                for transactionEntry in transactions {
                    guard let time = transactionEntry["time"] as? String,
                          let memo = transactionEntry["memo"] as? String,
                          let amount = transactionEntry["amount"] as? String,
                          let type = transactionEntry["type"] as? String else {
                        print("Invalid transaction data")
                        continue
                    }
                    let transaction = Transaction(time: time, memo: memo, type: type, amount: amount)
                    transactionsProcessed.append(transaction)
                }
                
                let receiveAddress = entry["receiveAddress"] as? String ?? ""
                let xpub = entry["xpub"] as? String ?? ""
                let hideBalance = entry["hideBalance"] as? Bool ?? false
                let paymentCode = entry["paymentCode"] as? String ?? ""
                
                let wallet = Wallet(
                    label: label,
                    balance: balance,
                    type: type,
                    preferredBalanceUnit: preferredBalanceUnit,
                    receiveAddress: receiveAddress,
                    transactions: transactionsProcessed,
                    identifier: String(index),  // Use index as the identifier here
                    xpub: xpub,
                    hideBalance: hideBalance,
                    paymentCode: paymentCode
                )
                wallets.append(wallet)
            }
            
            // Save the updated wallets back to Keychain using Codable
            do {
                let encodedWallets = try JSONEncoder().encode(wallets)
                KeychainManager.shared.set(encodedWallets, forKey: WatchDataSource.walletKeychainIdentifier)  // Use the static key
                WatchDataSource.postDataUpdatedNotification()
            } catch {
                print("Failed to encode and save wallets: \(error)")
            }
        } else {
            print("Invalid wallets data received")
        }
    }
    
    static func postDataUpdatedNotification() {
        NotificationCenter.default.post(Notifications.dataUpdated)
    }
    
    // Request a Lightning invoice from the iPhone companion app
    static func requestLightningInvoice(walletIdentifier: Int, amount: Double, description: String?, responseHandler: @escaping (_ invoice: String) -> Void) {
        guard WatchDataSource.shared.wallets.count > walletIdentifier else {
            responseHandler("")
            return
        }
        print("Requesting Lightning invoice from companion app for wallet index \(walletIdentifier) with amount \(amount)")
        
        WCSession.default.sendMessage(
            ["request": "createInvoice", "walletIndex": String(walletIdentifier), "amount": amount, "description": description ?? ""],  // Convert walletIdentifier to String
            replyHandler: { (reply: [String: Any]) in
                if let invoicePaymentRequest = reply["invoicePaymentRequest"] as? String, !invoicePaymentRequest.isEmpty {
                    print("Received Lightning invoice: \(invoicePaymentRequest)")
                    responseHandler(invoicePaymentRequest)
                } else {
                    print("Invalid invoice received or empty response")
                    responseHandler("")
                }
            },
            errorHandler: { (error) in
                print("Error requesting Lightning invoice: \(error)")
                responseHandler("")
            }
        )
    }
    
    // Toggle the wallet hide balance option and send a message to the iPhone companion app
  static func toggleWalletHideBalance(walletIdentifier: String, hideBalance: Bool, responseHandler: @escaping (_ result: String) -> Void) {
        guard WatchDataSource.shared.wallets.count > Int(walletIdentifier)! else {
            responseHandler("")
            return
        }
        print("Toggling hide balance for wallet index \(walletIdentifier) to \(hideBalance)")
        
        WCSession.default.sendMessage(
            ["message": "hideBalance", "walletIndex": String(walletIdentifier), "hideBalance": hideBalance],  // Convert walletIdentifier to String
            replyHandler: { _ in
                print("Successfully toggled hide balance")
                responseHandler("")
            },
            errorHandler: { (error) in
                print("Error toggling hide balance: \(error)")
                responseHandler("")
            }
        )
    }
    
    // Process the data received from the iPhone companion app, including fiat currency and wallet data
    func processData(data: [String: Any]) {
        if let preferredFiatCurrency = data["preferredFiatCurrency"] as? String,
           let preferredFiatCurrencyUnit = fiatUnit(currency: preferredFiatCurrency) {
          WatchDataSource.groupUserDefaults?.set(preferredFiatCurrencyUnit.endPointKey, forKey: "preferredCurrency")
          WatchDataSource.groupUserDefaults?.synchronize()
            
            let extensionDelegate = ExtensionDelegate()
            extensionDelegate.updatePreferredFiatCurrency()
            
            print("Updated preferred fiat currency to \(preferredFiatCurrency)")
        } else {
            WatchDataSource.shared.processWalletsData(walletsInfo: data)
        }
    }
}
