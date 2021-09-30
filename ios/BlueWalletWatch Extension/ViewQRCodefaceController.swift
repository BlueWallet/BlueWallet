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

class ViewQRCodefaceController: WKInterfaceController {
  
  static let identifier = "ViewQRCodefaceController"
  @IBOutlet weak var imageInterface: WKInterfaceImage!
  @IBOutlet weak var addressLabel: WKInterfaceLabel!
  var address: String? {
    didSet {
      if let address = address, !address.isEmpty{
        userActivity.userInfo = [HandOffUserInfoKey.Xpub.rawValue: address]
        userActivity.becomeCurrent()
      }
    }
  }
  private var interfaceMode = InterfaceMode.Address
  private let userActivity: NSUserActivity = NSUserActivity(activityType: HandoffIdentifier.Xpub.rawValue)
    
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    userActivity.title = HandOffTitle.Xpub.rawValue
    userActivity.requiredUserInfoKeys = [HandOffUserInfoKey.Xpub.rawValue]
    userActivity.isEligibleForHandoff = true
    guard let passedContext = context as? String  else {
      pop()
      return
    }
    address = passedContext
    addressLabel.setText(passedContext)

    DispatchQueue.main.async {
      guard let cgImage = EFQRCode.generate(
        content: passedContext) else {
          return
      }
      let image = UIImage(cgImage: cgImage)
      self.imageInterface.setImage(nil)
      self.imageInterface.setImage(image)
    }
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
  
  override func willActivate() {
    super.willActivate()
    update(userActivity)
  }

  
  override func didDeactivate() {
    super.didDeactivate()
    userActivity.invalidate()
    invalidateUserActivity()
  }
  
  
}
