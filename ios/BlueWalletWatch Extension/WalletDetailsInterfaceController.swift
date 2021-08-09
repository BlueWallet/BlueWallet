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
    processInterface(identifier: identifier)
  }
  
  func processInterface(identifier: Int)  {
  let wallet = WatchDataSource.shared.wallets[identifier]
  self.wallet = wallet
  walletBalanceLabel.setHidden(wallet.hideBalance)
  walletBalanceLabel.setText(wallet.hideBalance ? "" : wallet.balance)
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
    
    clearAllMenuItems()
    if wallet.type != "lightningCustodianWallet" && !(wallet.xpub ?? "").isEmpty {
      addMenuItem(with: .share, title: "View XPub", action: #selector(viewXPubMenuItemTapped))
    }
    if wallet.hideBalance {
      addMenuItem(with: .accept, title: "Show Balance", action: #selector(showBalanceMenuItemTapped))
    }else{
      addMenuItem(with: .decline, title: "Hide Balance", action: #selector(hideBalanceMenuItemTapped))
    }
  }
  
  @objc func showBalanceMenuItemTapped() {
    guard let identifier = wallet?.identifier else { return }
    WatchDataSource.toggleWalletHideBalance(walletIdentifier: identifier, hideBalance: false) { [weak self] _ in
      DispatchQueue.main.async {
        WatchDataSource.postDataUpdatedNotification()
        self?.processInterface(identifier: identifier)
      }
    }
  }
  
  @objc func hideBalanceMenuItemTapped() {
    guard let identifier = wallet?.identifier else { return }
    WatchDataSource.toggleWalletHideBalance(walletIdentifier: identifier, hideBalance: true) { [weak self] _ in
      DispatchQueue.main.async {
        WatchDataSource.postDataUpdatedNotification()
        self?.processInterface(identifier: identifier)
      }
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
    if (WatchDataSource.shared.companionWalletsInitialized) {
      pushController(withName: ReceiveInterfaceController.identifier, context: (wallet?.identifier, "createInvoice"))
    } else {
      presentAlert(withTitle: "Error", message: "Unable to create invoice. Please open BlueWallet on your iPhone and unlock your wallets.", preferredStyle: .alert, actions: [WKAlertAction(title: "OK", style: .default, handler: { [weak self] in
        self?.dismiss()
        })])
      }
  }
  
  override func contextForSegue(withIdentifier segueIdentifier: String) -> Any? {
    return (wallet?.identifier, "receive")
  }
  
}
