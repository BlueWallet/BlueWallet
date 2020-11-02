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
  var latestTransactionTime: Int = 0
  var formattedBalanceBTC: String {
      return "\(balance / 100000000) BTC"
  }

}


let emptyMarketData = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
