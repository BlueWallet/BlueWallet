//
//  Wallet.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/13/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation

struct Wallet: Encodable {
  static let identifier: String = "Wallet"

  var label: String
  var balance: String
  var type: String
  var preferredBalanceUnit: String
  var receiveAddress: String
}
