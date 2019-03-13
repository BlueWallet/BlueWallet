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
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    self.wallet = context as? Wallet
  }
  
  override func willActivate() {
    super.willActivate()
    guard let walletContext = wallet, !walletContext.receiveAddress.isEmpty, let cgImage = EFQRCode.generate(
      content: walletContext.receiveAddress
      ) else {
        self.dismiss()
        presentAlert(withTitle: "Error", message: "There was a problem showing the receive address.", preferredStyle: .alert, actions: [])
        return
    }
    
    let image = UIImage(cgImage: cgImage)
    imageInterface.setImage(image)
  }
  
}
