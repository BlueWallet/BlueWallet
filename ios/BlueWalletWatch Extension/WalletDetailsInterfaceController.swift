//
//  WalletDetailsInterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/11/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import Foundation


class WalletDetailsInterfaceController: WKInterfaceController {
  
  var wallet: Wallet?
  static let identifier = "WalletDetailsInterfaceController"
  @IBOutlet weak var walletBasicsGroup: WKInterfaceGroup!
  @IBOutlet weak var walletBalanceLabel: WKInterfaceLabel!
  @IBOutlet weak var walletNameLabel: WKInterfaceLabel!
  @IBOutlet weak var receiveButton: WKInterfaceButton!
  @IBOutlet weak var noTransactionsLabel: WKInterfaceLabel!
  @IBOutlet weak var transactionsTable: WKInterfaceTable!
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    let index = context as? Int ?? 0
    let wallet = WatchDataSource.shared.wallets[index]
    self.wallet = wallet
    walletBalanceLabel.setText(wallet.balance)
    walletNameLabel.setText(wallet.label)
    receiveButton.setEnabled(!wallet.receiveAddress.isEmpty)
    receiveButton.setHidden(wallet.receiveAddress.isEmpty)
    
    if wallet.type == "HDsegwitP2SH" {
      walletBasicsGroup.setBackgroundImageNamed("walletHD")
    } else if wallet.type == "lightningCustodianWallet" {
      walletBasicsGroup.setBackgroundImageNamed("walletLightningCustodial")
    }
    processWalletsTable()
  }
  
  override func willActivate() {
    // This method is called when watch view controller is about to be visible to user
    super.willActivate()
    transactionsTable.setHidden(wallet?.transactions.isEmpty ?? true)
    noTransactionsLabel.setHidden(!(wallet?.transactions.isEmpty ?? false))
  }
  
  override func didAppear() {
    super.didAppear()
    NotificationCenter.default.addObserver(self, selector: #selector(processWalletsTable), name: WatchDataSource.NotificationName.dataUpdated, object: nil)
  }
  
  override func willDisappear() {
    super.willDisappear()
    NotificationCenter.default.removeObserver(self, name: WatchDataSource.NotificationName.dataUpdated, object: nil)
  }

  
  @IBAction func receiveMenuItemTapped() {
    presentController(withName: ReceiveInterfaceController.identifier, context: wallet)
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
  }
  
  override func contextForSegue(withIdentifier segueIdentifier: String) -> Any? {
    return wallet
  }
  
}
