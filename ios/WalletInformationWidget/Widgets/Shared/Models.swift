//
//  Models.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/1/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

struct MarketData {
  var nextBlock: String
  var sats: String
  var price: String
  var rate: Double
  var formattedNextBlock: String {
    return nextBlock == "..." ? "..." : #"\#(nextBlock) sat/b"#
  }
}

struct WalletData {
  var balance: Double
  var formattedBalanceBTC: String {
      return "\(balance / 10000000) BTC"
  }
  var latestTransactionTime: Int = 0
}

let emptyMarketData = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
