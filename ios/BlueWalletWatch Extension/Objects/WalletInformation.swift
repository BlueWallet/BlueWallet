//
//  WalletInformation.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/10/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit

class WalletInformation: NSObject {
  
  @IBOutlet weak var walletBalanceLabel: WKInterfaceLabel!
  @IBOutlet private weak var walletNameLabel: WKInterfaceLabel!
  @IBOutlet private weak var walletGroup: WKInterfaceGroup!
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
  
  var type: WalletGradient = .SegwitHD {
    willSet {
      walletGroup.setBackgroundImageNamed(newValue.imageString)
    }
  }
  
}
