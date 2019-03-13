//
//  WalletInformation.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/10/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit

class WalletInformation: WKInterfaceGroup {
  
  @IBOutlet private weak var walletBalanceLabel: WKInterfaceLabel!
  @IBOutlet private weak var walletNameLabel: WKInterfaceLabel!
  static let identifier: String = "WalletInformation"
  
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
  
  var type: String = "HDsegwitP2SH" {
    willSet {
      if newValue == "HDsegwitP2SH" {
        setBackgroundImageNamed("walletHD")
      } else if newValue == "lightningCustodianWallet" {
        setBackgroundImageNamed("walletLightningCustodial")
      }
    }
  }
  
}
