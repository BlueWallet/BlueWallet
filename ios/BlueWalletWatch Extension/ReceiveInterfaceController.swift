//
//  ReceiveInterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/12/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import Foundation
import EFQRCode

class ReceiveInterfaceController: WKInterfaceController {
  
  static let identifier = "ReceiveInterfaceController"
  @IBOutlet weak var imageInterface: WKInterfaceImage!
  private var wallet: Wallet?
  private var isRenderingQRCode: Bool?
  @IBOutlet weak var loadingIndicator: WKInterfaceGroup!
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    self.wallet = context as? Wallet
    
    NotificationCenter.default.addObserver(forName: SpecifyInterfaceController.NotificationName.createQRCode, object: nil, queue: nil) { [weak self] (notification) in
      self?.isRenderingQRCode = true
      if let wallet = self?.wallet, wallet.type == "lightningCustodianWallet", let object = notification.object as? SpecifyInterfaceController.SpecificQRCodeContent, let amount = object.amount {
        self?.imageInterface.setHidden(true)
        self?.loadingIndicator.setHidden(false)
        WatchDataSource.requestLightningInvoice(wallet: wallet, amount: amount, description: object.description, responseHandler: { (invoice) in
          DispatchQueue.main.async {
            if (!invoice.isEmpty) {
              guard let cgImage = EFQRCode.generate(
                content: "lightning:\(invoice)") else {
                  return
              }
              let image = UIImage(cgImage: cgImage)
              self?.loadingIndicator.setHidden(true)
              self?.imageInterface.setHidden(false)
              self?.imageInterface.setImage(nil)
              self?.imageInterface.setImage(image)
            } else {
              self?.pop()
              self?.presentAlert(withTitle: "Error", message: "Unable to create invoice. Please, make sure your iPhone is paired and nearby.", preferredStyle: .alert, actions: [WKAlertAction(title: "OK", style: .default, handler: { [weak self] in
                self?.dismiss()
                })])
            }
          }
        })
      } else {
        guard let notificationObject = notification.object as? SpecifyInterfaceController.SpecificQRCodeContent, let walletContext = self?.wallet, !walletContext.receiveAddress.isEmpty, let receiveAddress = self?.wallet?.receiveAddress else { return }
        var address = "bitcoin:\(receiveAddress)"
        
        var hasAmount = false
        if let amount = notificationObject.amount {
          address.append("?amount=\(amount)&")
          hasAmount = true
        }
        if let description = notificationObject.description {
          if (!hasAmount) {
            address.append("?")
          }
          address.append("label=\(description)")
        }
        
        DispatchQueue.main.async {
          guard let cgImage = EFQRCode.generate(
            content: address) else {
              return
          }
          let image = UIImage(cgImage: cgImage)
          self?.imageInterface.setImage(nil)
          self?.imageInterface.setImage(image)
          self?.imageInterface.setHidden(false)
          self?.loadingIndicator.setHidden(true)
          self?.isRenderingQRCode = false
        }
      }
    }
    
    guard let walletContext = wallet, !walletContext.receiveAddress.isEmpty, let cgImage = EFQRCode.generate(
      content: walletContext.receiveAddress) else {
        return
    }
    
    let image = UIImage(cgImage: cgImage)
    imageInterface.setImage(image)
  }
  
  override func didAppear() {
    super.didAppear()
    if wallet?.type == "lightningCustodianWallet" {
      if isRenderingQRCode == nil {
        presentController(withName: SpecifyInterfaceController.identifier, context: wallet)
        isRenderingQRCode = false
      } else if isRenderingQRCode == false {
        pop()
      }
    }
  }
  
  override func didDeactivate() {
    super.didDeactivate()
    NotificationCenter.default.removeObserver(self, name: SpecifyInterfaceController.NotificationName.createQRCode, object: nil)
  }
  
  @IBAction func specifyMenuItemTapped() {
    presentController(withName: SpecifyInterfaceController.identifier, context: wallet)
  }
  
}
