//
//  WalletInformation.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/10/19.

//

import WatchKit

class WalletInformation: NSObject {
  
  @IBOutlet weak var walletBalanceLabel: WKInterfaceLabel!
  @IBOutlet private weak var walletNameLabel: WKInterfaceLabel!
  @IBOutlet private weak var walletGroup: WKInterfaceGroup!
  static let identifier: String = "WalletInformation"
  let type: Wallet? = nil
  
  var name: String = "" {
    willSet {
      walletNameLabel.setText(newValue)
    }
  }
  
  var balance: String = "" {
    willSet {
      walletBalanceLabel.setText(newValue)
    }
  }
  
  
  
}

// WalletInformation extension for configuration
extension WalletInformation {
  func configure(with wallet: Wallet) {
    walletBalanceLabel.setHidden(wallet.hideBalance)
    name = wallet.label
    balance = wallet.hideBalance ? "" : wallet.balance
  }
}
