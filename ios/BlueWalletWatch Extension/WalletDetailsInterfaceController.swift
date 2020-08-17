//
//  WalletDetailsInterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/11/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import Foundation
import WatchConnectivity

class WalletDetailsInterfaceController: WKInterfaceController {
  
  var wallet: Wallet?
  static let identifier = "WalletDetailsInterfaceController"
  @IBOutlet weak var walletBasicsGroup: WKInterfaceGroup!
  @IBOutlet weak var walletBalanceLabel: WKInterfaceLabel!
  @IBOutlet weak var createInvoiceButton: WKInterfaceButton!
  @IBOutlet weak var walletNameLabel: WKInterfaceLabel!
  @IBOutlet weak var receiveButton: WKInterfaceButton!
  @IBOutlet weak var noTransactionsLabel: WKInterfaceLabel!
  @IBOutlet weak var transactionsTable: WKInterfaceTable!
  
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    guard let identifier = context as? Int else {
      pop()
      return
    }
    let wallet = WatchDataSource.shared.wallets[identifier]
    self.wallet = wallet
    walletBalanceLabel.setText(wallet.balance)
    walletNameLabel.setText(wallet.label) 
    walletBasicsGroup.setBackgroundImageNamed(WalletGradient(rawValue: wallet.type)?.imageString)
    createInvoiceButton.setHidden(wallet.type != "lightningCustodianWallet")
    processWalletsTable()
    addMenuItems()
  }
  
  func addMenuItems() {
    guard let wallet = wallet else {
       return
    }
    if wallet.type != "lightningCustodianWallet" && !(wallet.xpub ?? "").isEmpty {
      addMenuItem(with: .share, title: "View XPub", action: #selector(viewXPubMenuItemTapped))
    }
  }
  
  @objc func viewXPubMenuItemTapped() {
    guard let xpub = wallet?.xpub else {
      return
    }
    presentController(withName: ViewQRCodefaceController.identifier, context: xpub)
  }
  
  override func willActivate() {
    super.willActivate()
    transactionsTable.setHidden(wallet?.transactions.isEmpty ?? true)
    noTransactionsLabel.setHidden(!(wallet?.transactions.isEmpty ?? false))
    receiveButton.setHidden(wallet?.receiveAddress.isEmpty ?? true)
    createInvoiceButton.setEnabled(WCSession.default.isReachable)
  }
  
  @IBAction func receiveMenuItemTapped() {
    presentController(withName: ReceiveInterfaceController.identifier, context: (wallet, "receive"))
  }
  
  
  @objc private func processWalletsTable() {
    transactionsTable.setNumberOfRows(wallet?.transactions.count ?? 0, withRowType: TransactionTableRow.identifier)
    
    for index in 0..<transactionsTable.numberOfRows {
      guard let controller = transactionsTable.rowController(at: index) as? TransactionTableRow, let transaction = wallet?.transactions[index] else { continue }
      
      controller.amount = transaction.amount
      controller.type = transaction.type
      controller.memo = transaction.memo
      controller.time = transaction.time
    }
    transactionsTable.setHidden(wallet?.transactions.isEmpty ?? true)
    noTransactionsLabel.setHidden(!(wallet?.transactions.isEmpty ?? false))
  }
  
  @IBAction func createInvoiceTapped() {
    if (WCSession.default.isReachable) {
      pushController(withName: ReceiveInterfaceController.identifier, context: (wallet?.identifier, "createInvoice"))
    }
  }
  
  override func contextForSegue(withIdentifier segueIdentifier: String) -> Any? {
    return (wallet?.identifier, "receive")
  }
  
}
