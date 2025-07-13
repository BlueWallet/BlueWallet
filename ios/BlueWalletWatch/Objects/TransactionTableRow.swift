//
//  TransactionTableRow.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/10/19.

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
      if type == .pending {
        transactionTimeLabel.setText("Pending...")
      } else {
        transactionTimeLabel.setText(newValue)
      }
    }
  }
  
  var type: TransactionType = .pending {
    willSet {
      if newValue == .pending {
        transactionTypeImage.setImage(UIImage(named: "pendingConfirmation"))
      } else if newValue == .received {
        transactionTypeImage.setImage(UIImage(named: "receivedArrow"))
      } else if newValue == .sent {
        transactionTypeImage.setImage(UIImage(named: "sentArrow"))
      } else {
        transactionTypeImage.setImage(nil)
      }
    }
  }
  
}

// TransactionTableRow extension for configuration
 extension TransactionTableRow {
   func configure(with transaction: Transaction) {
     amount = "\(transaction.amount)"
     
     type = transaction.type
     
     memo = transaction.memo
     
     let formatter = DateFormatter()
     formatter.dateStyle = .short
     formatter.timeStyle = .short
     time = formatter.string(from: transaction.time)
   }
 }
