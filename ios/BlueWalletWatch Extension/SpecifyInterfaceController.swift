//
//  SpecifyInterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/23/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import Foundation


class SpecifyInterfaceController: WKInterfaceController {

  static let identifier = "SpecifyInterfaceController"
  @IBOutlet weak var descriptionButton: WKInterfaceButton!
  @IBOutlet weak var amountButton: WKInterfaceButton!
  struct SpecificQRCodeContent {
    var amount: Double?
    var description: String?
    var amountStringArray: [String]?
  }
  var specifiedQRContent: SpecificQRCodeContent = SpecificQRCodeContent(amount: nil, description: nil, amountStringArray: nil)
  
  struct NotificationName {
    static let createQRCode = Notification.Name(rawValue: "Notification.SpecifyInterfaceController.createQRCode")
  }
  struct Notifications {
    static let createQRCode = Notification(name: NotificationName.createQRCode)
  }

  override func awake(withContext context: Any?) {
        super.awake(withContext: context)
    NotificationCenter.default.addObserver(forName: NumericKeypadInterfaceController.NotificationName.keypadDataChanged, object: nil, queue: nil) { [weak self] (notification) in
      guard let amountObject = notification.object as? [String], !amountObject.isEmpty else { return }
      if amountObject.count == 1 && (amountObject.first == "." || amountObject.first == "0") {
        return
      }
      var title = ""
      for amount in amountObject {
        let isValid = Double(amount)
        if amount == "." || isValid != nil {
          title.append(String(amount))
        }
      }
      self?.specifiedQRContent.amountStringArray = amountObject
      if let amountDouble = Double(title) {
        self?.specifiedQRContent.amount = amountDouble
        self?.amountButton.setTitle("\(title) BTC")
        }
      }
    }

    override func didDeactivate() {
        // This method is called when watch view controller is no longer visible
      super.didDeactivate()
      NotificationCenter.default.removeObserver(self, name: NumericKeypadInterfaceController.NotificationName.keypadDataChanged, object: nil)
    }

  @IBAction func descriptionButtonTapped() {
    presentTextInputController(withSuggestions: nil, allowedInputMode: .allowEmoji) { [weak self]  (result: [Any]?) in
      DispatchQueue.main.async {
        if let result = result, let text = result.first as? String   {
          self?.specifiedQRContent.description = text
          self?.descriptionButton.setTitle(nil)
          self?.descriptionButton.setTitle(text)
        }
      }
    }
  }
  
  @IBAction func createButtonTapped() {
    NotificationCenter.default.post(name: NotificationName.createQRCode, object: specifiedQRContent)
    dismiss()
  }
  
  override func contextForSegue(withIdentifier segueIdentifier: String) -> Any? {
    if segueIdentifier == NumericKeypadInterfaceController.identifier {
      return specifiedQRContent
    }
    return nil
  }
  
}
