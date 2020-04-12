//
//  WatchDataSource.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/20/19.
//  Copyright © 2019 Facebook. All rights reserved.
//


import Foundation
import WatchConnectivity

class WatchDataSource: NSObject, WCSessionDelegate {
  struct NotificationName {
    static let dataUpdated = Notification.Name(rawValue: "Notification.WalletDataSource.Updated")
  }
  struct Notifications {
    static let dataUpdated = Notification(name: NotificationName.dataUpdated)
  }
  
  static let shared = WatchDataSource()
  var wallets: [Wallet] = [Wallet]()
  private let keychain = KeychainSwift()
  
  override init() {
    super.init()
    if WCSession.isSupported() {
      print("Activating watch session")
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }
  
  func processWalletsData(walletsInfo: [String: Any]) {
    if let walletsToProcess = walletsInfo["wallets"] as? [[String: Any]], !walletsToProcess.isEmpty {
      wallets.removeAll();
      for (index, entry) in walletsToProcess.enumerated() {
        guard let label = entry["label"] as? String, let balance = entry["balance"] as? String, let type = entry["type"] as? String, let preferredBalanceUnit = entry["preferredBalanceUnit"] as? String, let transactions = entry["transactions"] as? [[String: Any]]  else {
          continue
        }
        var transactionsProcessed = [Transaction]()
        for transactionEntry in transactions {
          guard let time = transactionEntry["time"] as? String, let memo = transactionEntry["memo"] as? String, let amount = transactionEntry["amount"] as? String, let type =  transactionEntry["type"] as? String else { continue }
          let transaction = Transaction(time: time, memo: memo, type: type, amount: amount)
          transactionsProcessed.append(transaction)
        }
        let receiveAddress = entry["receiveAddress"] as? String ?? ""
        let wallet = Wallet(label: label, balance: balance, type: type, preferredBalanceUnit: preferredBalanceUnit, receiveAddress: receiveAddress, transactions: transactionsProcessed, identifier: index)
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
  
  static func requestLightningInvoice(walletIdentifier: Int, amount: Double, description: String?, responseHandler: @escaping (_ invoice: String) -> Void) {
    guard WatchDataSource.shared.wallets.count > walletIdentifier  else {
      responseHandler("")
      return
    }
    WCSession.default.sendMessage(["request": "createInvoice", "walletIndex": walletIdentifier, "amount": amount, "description": description ?? ""], replyHandler: { (reply: [String : Any]) in
      if let invoicePaymentRequest =  reply["invoicePaymentRequest"] as? String, !invoicePaymentRequest.isEmpty {
        responseHandler(invoicePaymentRequest)
      } else {
        responseHandler("")
      }
    }) { (error) in
      print(error)
      responseHandler("")
      
    }
  }
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
    WatchDataSource.shared.processWalletsData(walletsInfo: applicationContext)
  }
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
    WatchDataSource.shared.processWalletsData(walletsInfo: applicationContext)
  }
  
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if activationState == .activated {
      if let existingData = keychain.getData(Wallet.identifier), let walletData = ((try? NSKeyedUnarchiver.unarchiveTopLevelObjectWithData(existingData) as? [Wallet]) as [Wallet]??) {
        guard let walletData = walletData, walletData != self.wallets  else { return }
        wallets = walletData
        WatchDataSource.postDataUpdatedNotification()
      }
      WCSession.default.sendMessage(["message" : "sendApplicationContext"], replyHandler: { (replyData) in
      }) { (error) in
        print(error)
      }
    }
  }
  
}
