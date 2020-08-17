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
  var qrcodeData: String?
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    guard let passedContext = context as? String  else {
      pop()
      return
    }
    
    DispatchQueue.main.async {
      guard let cgImage = EFQRCode.generate(
        content: passedContext) else {
          return
      }
      let image = UIImage(cgImage: cgImage)
      self.imageInterface.setImage(nil)
      self.imageInterface.setImage(image)
    }
  }
  
}
