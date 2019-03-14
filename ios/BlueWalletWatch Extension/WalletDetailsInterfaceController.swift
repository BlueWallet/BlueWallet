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
    guard let wallet = context as? Wallet else { return }
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
  }
  
  override func willActivate() {
    // This method is called when watch view controller is about to be visible to user
    super.willActivate()
    transactionsTable.setHidden(wallet?.transactions.isEmpty ?? true)
    noTransactionsLabel.setHidden(!(wallet?.transactions.isEmpty ?? false))
  }
  
  override func didDeactivate() {
    // This method is called when watch view controller is no longer visible
    super.didDeactivate()
  }
  
  override func contextForSegue(withIdentifier segueIdentifier: String) -> Any? {
    return wallet
  }
  
}
