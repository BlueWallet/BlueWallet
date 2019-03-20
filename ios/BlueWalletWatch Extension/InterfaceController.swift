//
//  InterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/6/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import WatchConnectivity
import Foundation


class InterfaceController: WKInterfaceController, WCSessionDelegate {
  
  private let keychain = KeychainSwift()
  var session: WCSession?
  private var wallets = [Wallet]()
  @IBOutlet weak var walletsTable: WKInterfaceTable!
  @IBOutlet weak var loadingIndicatorGroup: WKInterfaceGroup!
  @IBOutlet weak var noWalletsAvailableLabel: WKInterfaceLabel!
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    if WCSession.isSupported() {
      print("Activating watch session")
      self.session = WCSession.default
      self.session?.delegate = self
      self.session?.activate()
      
      if let existingData = keychain.getData(Wallet.identifier), let walletData = try? NSKeyedUnarchiver.unarchiveTopLevelObjectWithData(existingData) as? [Wallet] {
        guard let walletData = walletData else { return }
        wallets = walletData
        processWalletsTable()
      }
    }
  }
  
  override func willActivate() {
    // This method is called when watch view controller is about to be visible to user
    super.willActivate()
    session?.sendMessage(["message" : "sendApplicationContext"], replyHandler: nil, errorHandler: nil)
    
    if (wallets.isEmpty) {
      loadingIndicatorGroup.setHidden(true)
      noWalletsAvailableLabel.setHidden(false)
    }
  }
  
  private func processWalletsTable() {
    walletsTable.setNumberOfRows(wallets.count, withRowType: WalletInformation.identifier)
    
    for index in 0..<walletsTable.numberOfRows {
      guard let controller = walletsTable.rowController(at: index) as? WalletInformation else { continue }
      let wallet = wallets[index]
      controller.name = wallet.label
      controller.balance = wallet.balance
      controller.type = wallet.type
    }
    loadingIndicatorGroup.setHidden(true)
    noWalletsAvailableLabel.setHidden(!wallets.isEmpty)
  }
  
  private func processWalletsData(walletsInfo: [String: Any]) {
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
      processWalletsTable()
    }
  }
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
    processWalletsData(walletsInfo: applicationContext)
  }
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
    processWalletsData(walletsInfo: applicationContext)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
    processWalletsData(walletsInfo: userInfo)
  }
  
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    // Not used
  }
  
  override func contextForSegue(withIdentifier segueIdentifier: String, in table: WKInterfaceTable, rowIndex: Int) -> Any? {
    return wallets[rowIndex];
  }
  
}
