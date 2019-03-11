//
//  WalletDetailsInterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/11/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import Foundation


class WalletDetailsInterfaceController: WKInterfaceController {
  
    static let identifier = "WalletDetailsInterfaceController"
    @IBOutlet weak var walletBasicsGroup: WKInterfaceGroup!
    @IBOutlet weak var walletBalanceLabel: WKInterfaceLabel!
    @IBOutlet weak var walletNameLabel: WKInterfaceLabel!
    
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

}
