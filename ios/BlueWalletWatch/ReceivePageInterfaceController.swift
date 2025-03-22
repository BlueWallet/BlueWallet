//
//  ReceivePageViewController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 6/15/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation
import WatchKit

class ReceivePageInterfaceController: WKInterfaceController {
  static let identifier = "ReceivePageInterfaceController"
    var pageNames = ["Address", "Payment Code"]
    var pageControllers = ["ReceiveInterfaceController", "ReceiveInterfaceController"]

    override func awake(withContext context: Any?) {
        super.awake(withContext: context)
      
      let wallet = context as? Wallet

        WKInterfaceController.reloadRootPageControllers(
            withNames: pageControllers,
            contexts: [(wallet,ReceiveMethod.Onchain ,  ReceiveType.Address), (wallet, ReceiveMethod.Onchain, ReceiveType.PaymentCode)],
            orientation: .horizontal,
            pageIndex: 0
        )
    }
}
