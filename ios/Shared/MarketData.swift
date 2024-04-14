//
//  MarketData.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
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

enum MarketDataTimeline: String {
  case Previous = "previous"
  case Current = "current"
}
