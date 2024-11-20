//
//  WalletData.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

struct WalletData {
  var balance: Double
  var latestTransactionTime: LatestTransaction = LatestTransaction(isUnconfirmed: false, epochValue: 0)
  var formattedBalanceBTC: String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .none
    formatter.usesSignificantDigits = true
    formatter.maximumSignificantDigits = 9
    formatter.roundingMode = .up
    let value = NSNumber(value: balance / 100000000);
    if let valueString = formatter.string(from: value) {
      return "\(String(describing: valueString)) \(BitcoinUnit.btc.rawValue)"
    } else {
      return "0 \(BitcoinUnit.btc.rawValue)"
    }
  }
}
