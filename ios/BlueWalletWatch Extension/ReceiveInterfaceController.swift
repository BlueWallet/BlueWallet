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
  
  override func awake(withContext context: Any?) {
        super.awake(withContext: context)
      if let tryImage = EFQRCode.generate(
        content: "https://github.com/EFPrefix/EFQRCode",
        watermark: UIImage(named: "qr-code")?.toCGImage()
        ) {
        print("Create QRCode image success: \(tryImage)")
        let image = UIImage(cgImage: tryImage)
        imageInterface.setImage(image)
      } else {
        print("Create QRCode image failed!")
      }
        // Configure interface objects here.
    }

    override func willActivate() {
        // This method is called when watch view controller is about to be visible to user
        super.willActivate()
    }

    override func didDeactivate() {
        // This method is called when watch view controller is no longer visible
        super.didDeactivate()
    }

}
