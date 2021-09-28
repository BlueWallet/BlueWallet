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
  var qrcodeData: String?
  private var interfaceMode = InterfaceMode.Address
  private let userActivity: NSUserActivity = NSUserActivity(activityType: HandOffUserInfoKey.Xpub.rawValue)
    
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    guard let passedContext = context as? String  else {
      pop()
      return
    }
    addressLabel.setText(passedContext)
    
    userActivity.userInfo = [HandOffUserInfoKey.Xpub.rawValue: passedContext]
    userActivity.isEligibleForHandoff = true
    userActivity.becomeCurrent()
    update(userActivity)
    
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
