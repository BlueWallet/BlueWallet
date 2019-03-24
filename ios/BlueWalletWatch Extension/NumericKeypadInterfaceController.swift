//
//  NumericKeypadInterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/23/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import Foundation


class NumericKeypadInterfaceController: WKInterfaceController {

    static let identifier = "NumericKeypadInterfaceController"
  private var amount: [String] = ["0"]
  
    override func awake(withContext context: Any?) {
        super.awake(withContext: context)
        
        // Configure interface objects here.
    }

    override func willActivate() {
        // This method is called when watch view controller is about to be visible to user
        super.willActivate()
        updateTitle()
    }
  
  private func updateTitle() {
    var title = ""
    for amount in self.amount {
      let isValid = Double(amount)
      if amount == "." || isValid != nil {
        title.append(String(amount))
      }
    }
    setTitle("\(title) BTC")
  }
  
  private func append(value: String) {
    let tempAmount = amount.filter({$0 != "."})
    guard tempAmount.count <= 9 else {
      return
    }
    amount.append("\(value)")
    updateTitle()
  }
  
  @IBAction func keypadNumberOneTapped() {
    append(value: "1")
  }
  
  @IBAction func keypadNumberTwoTapped() {
    append(value: "2")
  }
  
  @IBAction func keypadNumberThreeTapped() {
    append(value: "3")
  }
  
  @IBAction func keypadNumberFourTapped() {
    append(value: "4")
  }
  
  @IBAction func keypadNumberFiveTapped() {
    append(value: "5")
  }
  
  @IBAction func keypadNumberSixTapped() {
    append(value: "6")
  }
  
  @IBAction func keypadNumberSevenTapped() {
    append(value: "7")
  }
  
  @IBAction func keypadNumberEightTapped() {
    append(value: "8")
  }
  
  @IBAction func keypadNumberNineTapped() {
    append(value: "9")
  }
  
  @IBAction func keypadNumberZeroTapped() {
    append(value: "0")
  }
  
  @IBAction func keypadNumberDotTapped() {
    append(value: ".")
  }
  
  @IBAction func keypadNumberRemoveTapped() {
    amount.removeLast()
  }
  

}
