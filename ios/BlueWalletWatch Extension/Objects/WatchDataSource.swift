//
//  WatchDataSource.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/20/19.
//  Copyright © 2019 Facebook. All rights reserved.
//


import Foundation
import WatchConnectivity

class WatchDataSource {
  struct NotificationName {
    static let dataUpdated = Notification.Name(rawValue: "Notification.WalletDataSource.Updated")
  }
  struct Notifications {
    static let dataUpdated = Notification(name: NotificationName.dataUpdated)
  }
  
  static let shared = WatchDataSource()
  var wallets: [Wallet] = [Wallet]()
  private let keychain = KeychainSwift()
  
  init() {
    if let existingData = keychain.getData(Wallet.identifier), let walletData = try? NSKeyedUnarchiver.unarchiveTopLevelObjectWithData(existingData) as? [Wallet] {
      guard let walletData = walletData, walletData != self.wallets  else { return }
      wallets = walletData
      WatchDataSource.postDataUpdatedNotification()
    }
  }
  
  func processWalletsData(walletsInfo: [String: Any]) {
    if let walletsToProcess = walletsInfo["wallets"] as? [[String: Any]] {
      wallets.removeAll();
      for entry in walletsToProcess {
        guard let label = entry["label"] as? String, let balance = entry["balance"] as? String, let type = entry["type"] as? String, let preferredBalanceUnit = entry["preferredBalanceUnit"] as? String, let receiveAddress = entry["receiveAddress"] as? String, let transactions = entry["transactions"] as? [[String: Any]]  else {
          continue
        }
        var transactionsProcessed = [Transaction]()
        for transactionEntry in transactions {
          guard let time = transactionEntry["time"] as? String, let memo = transactionEntry["memo"] as? String, let amount = transactionEntry["amount"] as? String, let type =  transactionEntry["type"] as? String else { continue }
          let transaction = Transaction(time: time, memo: memo, type: type, amount: amount)
          transactionsProcessed.append(transaction)
        }
        let wallet = Wallet(label: label, balance: balance, type: type, preferredBalanceUnit: preferredBalanceUnit, receiveAddress: receiveAddress, transactions: transactionsProcessed)
        wallets.append(wallet)
      }
      
      if let walletsArchived = try? NSKeyedArchiver.archivedData(withRootObject: wallets, requiringSecureCoding: false) {
        keychain.set(walletsArchived, forKey: Wallet.identifier)
      }
      WatchDataSource.postDataUpdatedNotification()
    }
  }
  
  static func postDataUpdatedNotification() {
    NotificationCenter.default.post(Notifications.dataUpdated)
  }
  
  static func requestLightningInvoice(wallet: Wallet, amount: Double, description: String?, responseHandler: @escaping (_ invoice: String) -> Void) {
    guard let walletIndex = shared.wallets.firstIndex(of: wallet) else { return }
    WCSession.default.sendMessage(["request": "createInvoice", "walletIndex": walletIndex, "amount": amount, "description": description ?? ""], replyHandler: { (reply: [String : Any]) in
      if let invoicePaymentRequest =  reply["invoicePaymentRequest"] as? String, !invoicePaymentRequest.isEmpty {
        responseHandler(invoicePaymentRequest)
      }})
  }
}
