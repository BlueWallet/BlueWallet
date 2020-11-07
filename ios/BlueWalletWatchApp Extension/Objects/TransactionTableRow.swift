//
//  TransactionTableRow.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/10/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit

class TransactionTableRow: NSObject {
  
  @IBOutlet private weak var transactionAmountLabel: WKInterfaceLabel!
  @IBOutlet private weak var transactionMemoLabel: WKInterfaceLabel!
  @IBOutlet private weak var transactionTimeLabel: WKInterfaceLabel!
  @IBOutlet private weak var transactionTypeImage: WKInterfaceImage!

  static let identifier: String = "TransactionTableRow"
  
  var amount: String = "" {
    willSet {
      transactionAmountLabel.setText(newValue)
    }
  }
  
  var memo: String = "" {
    willSet {
      transactionMemoLabel.setText(newValue)
    }
  }
  
  var time: String = "" {
    willSet {
      transactionTimeLabel.setText(newValue)
    }
  }
  
  var type: String = "" {
    willSet {
      if (newValue == "pendingConfirmation") {
        transactionTypeImage.setImage(UIImage(named: "pendingConfirmation"))
      } else if (newValue == "received") {
        transactionTypeImage.setImage(UIImage(named: "receivedArrow"))
      } else if (newValue == "sent") {
        transactionTypeImage.setImage(UIImage(named: "sentArrow"))
      } else {
        transactionTypeImage.setImage(nil)
      }
    }
  }
  
}
