//
//  Models.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/1/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import Foundation

struct MarketData:Codable  {
  var nextBlock: String
  var sats: String
  var price: String
  var rate: Double
  var formattedNextBlock: String {
    return nextBlock == "..." ? "..." : #"\#(nextBlock) sat/b"#
  }
  var dateString: String = ""
  var formattedDate: String? {
    let isoDateFormatter = ISO8601DateFormatter()
    let dateFormatter = DateFormatter()
    dateFormatter.locale = Locale.current
    dateFormatter.timeStyle = .short
    
    if let date = isoDateFormatter.date(from: dateString) {
      return dateFormatter.string(from: date)
    }
    return nil
  }
  static let string = "MarketData"
}

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
      return "\(String(describing: valueString)) BTC"
    } else {
      return "0 BTC"
    }
  }

}

struct LatestTransaction {
  let isUnconfirmed: Bool?
  let epochValue: Int?
}
let emptyMarketData = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
let emptyWalletData = WalletData(balance: 0, latestTransactionTime:  LatestTransaction(isUnconfirmed: false, epochValue: Int(Date().timeIntervalSince1970)))

enum MarketDataTimeline: String {
  case Previous = "previous"
  case Current = "current"
}

enum UserDefaultsGroupKey: String {
  case GroupName = "group.io.bluewallet.bluewallet"
  case PreferredCurrency = "preferredCurrency"
  case ElectrumSettingsHost = "electrum_host"
  case ElectrumSettingsTCPPort = "electrum_tcp_port"
  case ElectrumSettingsSSLPort = "electrum_ssl_port"
  case AllWalletsBalance = "WidgetCommunicationAllWalletsSatoshiBalance"
  case AllWalletsLatestTransactionTime = "WidgetCommunicationAllWalletsLatestTransactionTime"
  case LatestTransactionIsUnconfirmed = "\"WidgetCommunicationLatestTransactionIsUnconfirmed\""
}
