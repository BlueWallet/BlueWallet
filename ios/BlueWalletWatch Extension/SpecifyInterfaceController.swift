//
//  SpecifyInterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/23/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import WatchConnectivity
import Foundation

class SpecifyInterfaceController: WKInterfaceController {

  static let identifier = "SpecifyInterfaceController"
  @IBOutlet weak var descriptionButton: WKInterfaceButton!
  @IBOutlet weak var amountButton: WKInterfaceButton!
  @IBOutlet weak var createButton: WKInterfaceButton!
  
  struct SpecificQRCodeContent {
    var amount: Double?
    var description: String?
    var amountStringArray: [String] = ["0"]
    var bitcoinUnit: NumericKeypadInterfaceController.NumericKeypadType = .BTC
  }
  var specifiedQRContent: SpecificQRCodeContent = SpecificQRCodeContent(amount: nil, description: nil, amountStringArray: ["0"], bitcoinUnit: .BTC)
  var wallet: Wallet?
  struct NotificationName {
    static let createQRCode = Notification.Name(rawValue: "Notification.SpecifyInterfaceController.createQRCode")
  }
  struct Notifications {
    static let createQRCode = Notification(name: NotificationName.createQRCode)
  }

  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    guard let identifier = context as? Int, WatchDataSource.shared.wallets.count > identifier else {
     return
    }
    let wallet = WatchDataSource.shared.wallets[identifier]
    self.wallet = wallet
    self.createButton.setAlpha(0.5)
    self.specifiedQRContent.bitcoinUnit = wallet.type == "lightningCustodianWallet" ? .SATS : .BTC
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
      if let amountDouble = Double(title), let keyPadType = self?.specifiedQRContent.bitcoinUnit {
        self?.specifiedQRContent.amount = amountDouble
        self?.amountButton.setTitle("\(title) \(keyPadType)")
        
        var isShouldCreateButtonBeEnabled = amountDouble > 0 && !title.isEmpty
        
        if (wallet.type == "lightningCustodianWallet" && !WCSession.default.isReachable) {
          isShouldCreateButtonBeEnabled = false
        }
        
        self?.createButton.setEnabled(isShouldCreateButtonBeEnabled)
        self?.createButton.setAlpha(isShouldCreateButtonBeEnabled ? 1.0 : 0.5)
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
    if (WCSession.default.activationState == .activated) {
      NotificationCenter.default.post(name: NotificationName.createQRCode, object: specifiedQRContent)
      dismiss()
    } else {
      presentAlert(withTitle: "Error", message: "Unable to create invoice. Please open BlueWallet on your iPhone and unlock your wallets.", preferredStyle: .alert, actions: [WKAlertAction(title: "OK", style: .default, handler: { [weak self] in
        self?.dismiss()
        })])
    }
  }
  
  override func contextForSegue(withIdentifier segueIdentifier: String) -> Any? {
    if segueIdentifier == NumericKeypadInterfaceController.identifier {
      return specifiedQRContent
    }
    return nil
  }
  
}
