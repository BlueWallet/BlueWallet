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
  struct NotificationName {
    static let keypadDataChanged = Notification.Name(rawValue: "Notification.NumericKeypadInterfaceController.keypadDataChanged")
  }
  struct Notifications {
    static let keypadDataChanged = Notification(name: NotificationName.keypadDataChanged)
  }
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    if let context = context as? SpecifyInterfaceController.SpecificQRCodeContent {
      amount = context.amountStringArray
    }
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
    if title.isEmpty {
      title = "0"
    }
    setTitle("< \(title) BTC")
    NotificationCenter.default.post(name: NotificationName.keypadDataChanged, object: amount)
  }
  
  private func append(value: String) {
    guard amount.filter({$0 != "."}).count <= 9 && !(amount.contains(".") && value == ".") else {
      return
    }
    if amount.isEmpty {
      if (value == "0") {
        amount.append("0")
      } else if value == "." && !amount.contains(".") {
        amount.append("0")
        amount.append(".")
      } else {
        amount.append(value)
      }
    } else if let first = amount.first, first == "0" {
      if amount.count > 1, amount[1] != "." {
        amount.insert(".", at: 1)
      } else if amount.count == 1, amount.first == "0" && value != "." {
        amount.append(".")
        amount.append(value)
      } else {
        amount.append(value)
      }
    } else {
      amount.append(value)
    }
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
    guard !amount.contains(".") else { return }
    append(value: ".")
  }
  
  @IBAction func keypadNumberRemoveTapped() {
    guard !amount.isEmpty else {
      setTitle("< 0 BTC")
      return
    }
    amount.removeLast()
    updateTitle()
  }
  
}
