//
//  ReceiveInterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/12/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import WatchConnectivity
import Foundation
import EFQRCode

class ReceiveInterfaceController: WKInterfaceController {
  
  static let identifier = "ReceiveInterfaceController"
  @IBOutlet weak var imageInterface: WKInterfaceImage!
  private var wallet: Wallet?
  private var isRenderingQRCode: Bool?
  private var receiveMethod: String = "receive"
  @IBOutlet weak var loadingIndicator: WKInterfaceGroup!
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    guard let passedContext = context as? (Int, String), WatchDataSource.shared.wallets.count >= passedContext.0   else {
      pop()
      return
    }
    let identifier = passedContext.0
    let wallet = WatchDataSource.shared.wallets[identifier]
    self.wallet = wallet
    receiveMethod = passedContext.1
    NotificationCenter.default.addObserver(forName: SpecifyInterfaceController.NotificationName.createQRCode, object: nil, queue: nil) { [weak self] (notification) in
      self?.isRenderingQRCode = true
      if let wallet = self?.wallet, wallet.type == "lightningCustodianWallet", self?.receiveMethod == "createInvoice", let object = notification.object as? SpecifyInterfaceController.SpecificQRCodeContent, let amount = object.amount {
        self?.imageInterface.setHidden(true)
        self?.loadingIndicator.setHidden(false)
        WatchDataSource.requestLightningInvoice(walletIdentifier: identifier, amount: amount, description: object.description, responseHandler: { (invoice) in
          DispatchQueue.main.async {
            if (!invoice.isEmpty) {
              guard let cgImage = EFQRCode.generate(
                content: "lightning:\(invoice)", inputCorrectionLevel: .h, pointShape: .circle) else {
                  return
              }
              let image = UIImage(cgImage: cgImage)
              self?.loadingIndicator.setHidden(true)
              self?.imageInterface.setHidden(false)
              self?.imageInterface.setImage(nil)
              self?.imageInterface.setImage(image)
              WCSession.default.sendMessage(["message": "fetchTransactions"], replyHandler: nil, errorHandler: nil)
            } else {
              self?.presentAlert(withTitle: "Error", message: "Unable to create invoice. Please, make sure your iPhone is paired and nearby.", preferredStyle: .alert, actions: [WKAlertAction(title: "OK", style: .default, handler: { [weak self] in
                self?.dismiss()
                self?.pop()
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
    
    guard !wallet.receiveAddress.isEmpty, let cgImage = EFQRCode.generate(
      content: wallet.receiveAddress), receiveMethod != "createInvoice" else {
        return
    }
    
    let image = UIImage(cgImage: cgImage)
    imageInterface.setImage(image)
  }
  
  override func didAppear() {
    super.didAppear()
    if wallet?.type == "lightningCustodianWallet" && receiveMethod == "createInvoice" {
      if isRenderingQRCode == nil {
        presentController(withName: SpecifyInterfaceController.identifier, context: wallet?.identifier)
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
    presentController(withName: SpecifyInterfaceController.identifier, context: wallet?.identifier)
  }
  
}
