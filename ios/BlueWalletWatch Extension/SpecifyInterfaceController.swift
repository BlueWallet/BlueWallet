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
  
  override func awake(withContext context: Any?) {
        super.awake(withContext: context)
        
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

  @IBAction func descriptionButtonTapped() {
    presentTextInputController(withSuggestions: nil, allowedInputMode: .allowEmoji) { [weak self]  (result: [Any]?) in
      if let text = result {
        self?.descriptionButton.setTitle(text.first as? String)
      }
    }
  }
  
  
  @IBAction func amountButtonTapped() {
    presentController(withName: NumericKeypadInterfaceController.identifier, context: nil)
  }
  
}
