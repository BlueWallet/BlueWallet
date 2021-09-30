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
  private var wallet: Wallet? {
    didSet {
      if let address = wallet?.receiveAddress {
        userActivity.userInfo = [HandOffUserInfoKey.ReceiveOnchain.rawValue: address]
        userActivity.isEligibleForHandoff = true;
        userActivity.becomeCurrent()
      }
    }
  }
  private var isRenderingQRCode: Bool?
  private var receiveMethod: String = "receive"
  private var interfaceMode: InterfaceMode = .Address
  @IBOutlet weak var addressLabel: WKInterfaceLabel!
  @IBOutlet weak var loadingIndicator: WKInterfaceGroup!
  @IBOutlet weak var imageInterface: WKInterfaceImage!
  private let userActivity: NSUserActivity = NSUserActivity(activityType: HandoffIdentifier.ReceiveOnchain.rawValue)

  override func willActivate() {
    super.willActivate()
    userActivity.title = HandOffTitle.ReceiveOnchain.rawValue
    userActivity.requiredUserInfoKeys = [HandOffUserInfoKey.Xpub.rawValue]
    userActivity.isEligibleForHandoff = true
    update(userActivity)
  }

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
      if let wallet = self?.wallet, wallet.type == WalletGradient.LightningCustodial.rawValue || wallet.type == WalletGradient.LightningLDK.rawValue, self?.receiveMethod == "createInvoice", let object = notification.object as? SpecifyInterfaceController.SpecificQRCodeContent, let amount = object.amount {
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
              self?.addressLabel.setText(invoice)
              self?.interfaceMode = .QRCode
              self?.toggleViewButtonPressed()
              WCSession.default.sendMessage(["message": "fetchTransactions"], replyHandler: nil, errorHandler: nil)
            } else {
              self?.presentAlert(withTitle: "Error", message: "Unable to create invoice. Please open BlueWallet on your iPhone and unlock your wallets.", preferredStyle: .alert, actions: [WKAlertAction(title: "OK", style: .default, handler: { [weak self] in
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
          self?.addressLabel.setText(receiveAddress)
          self?.interfaceMode = .QRCode
            self?.toggleViewButtonPressed()
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
    
    if #available(watchOSApplicationExtension 6.0, *) {
         if let image = UIImage(systemName: "textformat.subscript") {
           addMenuItem(with: image, title: "Address", action:#selector(toggleViewButtonPressed))
         } else {
           addMenuItem(with: .shuffle, title: "Address", action: #selector(toggleViewButtonPressed))
         }
       } else {
         addMenuItem(with: .shuffle, title: "Address", action: #selector(toggleViewButtonPressed))
       }
    addressLabel.setText(wallet.receiveAddress)
  }
  
  override func didAppear() {
    super.didAppear()
    if (wallet?.type == WalletGradient.LightningCustodial.rawValue || wallet?.type == WalletGradient.LightningLDK.rawValue) && receiveMethod == "createInvoice" {
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
    userActivity.invalidate()
    invalidateUserActivity()

  }
  
  @IBAction func specifyMenuItemTapped() {
    presentController(withName: SpecifyInterfaceController.identifier, context: wallet?.identifier)
  }
  
  
  @IBAction @objc func toggleViewButtonPressed() {
    clearAllMenuItems()
    switch interfaceMode {
    case .Address:
      addressLabel.setHidden(false)
      imageInterface.setHidden(true)
      if #available(watchOSApplicationExtension 6.0, *) {
        if let image = UIImage(systemName: "qrcode") {
          addMenuItem(with: image, title: "QR Code", action:#selector(toggleViewButtonPressed))
        } else {
          addMenuItem(with: .shuffle, title: "QR Code", action: #selector(toggleViewButtonPressed))
        }
      } else {
        addMenuItem(with: .shuffle, title: "QR Code", action: #selector(toggleViewButtonPressed))
        
      }
    case .QRCode:
      addressLabel.setHidden(true)
      imageInterface.setHidden(false)
      if #available(watchOSApplicationExtension 6.0, *) {
        if let image = UIImage(systemName: "textformat.subscript") {
          addMenuItem(with: image, title: "Address", action:#selector(toggleViewButtonPressed))
        } else {
          addMenuItem(with: .shuffle, title: "Address", action: #selector(toggleViewButtonPressed))
        }
      } else {
        addMenuItem(with: .shuffle, title: "Address", action: #selector(toggleViewButtonPressed))
      }
    }
    interfaceMode = interfaceMode == .QRCode ? .Address : .QRCode
  }
}
