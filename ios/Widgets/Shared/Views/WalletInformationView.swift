//
//  WalletInformationView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/3/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI
import WidgetKit

struct WalletInformationView: View {
  
  var allWalletsBalance: WalletData = emptyWalletData
  var marketData: MarketData = emptyMarketData
  
  var formattedBalance: String {
    let numberFormatter = NumberFormatter()
    numberFormatter.locale = Locale(identifier: WidgetAPI.getUserPreferredCurrencyLocale())
    numberFormatter.numberStyle = .currency
    let amount = numberFormatter.string(from:  NSNumber(value: ((allWalletsBalance.balance / 100000000) * marketData.rate))) ?? ""
    return amount
  }
  var formattedLatestTransactionTime: String {
    if allWalletsBalance.latestTransactionTime.isUnconfirmed == true {
      return "Pending..."
    } else if allWalletsBalance.latestTransactionTime.epochValue == 0 {
      return "Never"
    }
    guard let epochValue = allWalletsBalance.latestTransactionTime.epochValue else {
      return "Never"
    }
    let forDate = Date(timeIntervalSince1970: TimeInterval(epochValue / 1000))
    let dateFormatter = RelativeDateTimeFormatter()
    dateFormatter.locale = Locale(identifier: Locale.current.identifier)
    dateFormatter.dateTimeStyle = .numeric
    return dateFormatter.localizedString(for: forDate, relativeTo: Date())
  }
  
    var body: some View {
        VStack(alignment: .leading, spacing:nil , content: {
            Text(allWalletsBalance.formattedBalanceBTC).font(Font.system(size: 15, weight: .medium, design: .default)).foregroundColor(.textColorLightGray).lineLimit(1).minimumScaleFactor(0.01)
          
  
          Text(formattedBalance).lineLimit(1).foregroundColor(.textColor).font(Font.system(size:28, weight: .bold, design: .default)).minimumScaleFactor(0.01)
      Spacer()
        
              Text("Latest transaction").font(Font.system(size: 11, weight: .regular, design: .default)).foregroundColor(.textColorLightGray)
              Text(formattedLatestTransactionTime).lineLimit(1).foregroundColor(.textColor).font(Font.system(size:13, weight: .regular, design: .default)).minimumScaleFactor(0.01)
        
      }).frame(minWidth: 0,
               maxWidth: .infinity,
               minHeight: 0,
               maxHeight: .infinity,
               alignment: .topLeading)
    }
}

struct WalletInformationView_Previews: PreviewProvider {
  static var previews: some View {
    WalletInformationView(allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: Double(13000)))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
