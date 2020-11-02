//
//  WalletInformationAndMarketWidget.swift
//  WalletInformationAndMarketWidget
//
//  Created by Marcos Rodriguez on 10/29/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    SimpleEntry(date: Date(), marketData: emptyMarketData)
  }
  
  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
    let entry: SimpleEntry
    if (context.isPreview) {
      entry = SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000), allWalletsBalance: WalletData(balance: 1000000, latestTransactionTime: 1568804029000))
    } else {
      entry = SimpleEntry(date: Date(), marketData: emptyMarketData)
    }
    completion(entry)
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [SimpleEntry] = []
    let userPreferredCurrency = WidgetAPI.getUserPreferredCurrency();
    let allwalletsBalance = WalletData(balance: UserDefaultsGroup.getAllWalletsBalance(), latestTransactionTime: UserDefaultsGroup.getAllWalletsLatestTransactionTime())
    let marketDataEntry = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
    WidgetAPI.fetchMarketData(currency: userPreferredCurrency, completion: { (result, error) in
      let entry: SimpleEntry
      if let result = result {
        entry = SimpleEntry(date: Date(), marketData: result, allWalletsBalance: allwalletsBalance)
        
      } else {
        entry = SimpleEntry(date: Date(), marketData: marketDataEntry, allWalletsBalance: allwalletsBalance)
      }
      entries.append(entry)
      let timeline = Timeline(entries: entries, policy: .atEnd)
      completion(timeline)
    })
  }
}

struct SimpleEntry: TimelineEntry {
  let date: Date
  let marketData: MarketData
  var allWalletsBalance: WalletData = WalletData(balance: 0)
}

struct WalletInformationAndMarketWidgetEntryView : View {
  var entry: Provider.Entry
  var formattedBalance: String {
      let numberFormatter = NumberFormatter()
      numberFormatter.locale = Locale(identifier: WidgetAPI.getUserPreferredCurrencyLocale())
      numberFormatter.numberStyle = .currency
      numberFormatter.numberStyle = .currency
    let amount = numberFormatter.string(from:  NSNumber(value: ((entry.allWalletsBalance.balance / 100000000) * entry.marketData.rate))) ?? ""
    return amount
  }
  var formattedLatestTransactionTime: String {
    if entry.allWalletsBalance.latestTransactionTime == 0 {
      return "never"
    }
    let forDate = Date(timeIntervalSince1970: (TimeInterval(entry.allWalletsBalance.latestTransactionTime) / 1000))
      let dateFormatter = RelativeDateTimeFormatter()
    dateFormatter.locale = Locale(identifier: Locale.current.identifier)
    dateFormatter.dateTimeStyle = .numeric
    return dateFormatter.localizedString(for: forDate, relativeTo: Date())
  }
  
  var WalletBalance: some View {
    VStack(alignment: .leading, spacing:nil , content: {
      VStack(alignment: .leading, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
        Text(entry.allWalletsBalance.formattedBalanceBTC).font(Font.system(size: 15, weight: .medium, design: .default)).foregroundColor(.textColorLightGray).lineLimit(1).minimumScaleFactor(0.01)
        Text(formattedBalance).lineLimit(1).foregroundColor(.textColor).font(Font.system(size:28, weight: .bold, design: .default)).minimumScaleFactor(0.01)
      }).padding()
      Spacer()
      VStack(content: {
        VStack(alignment: .leading, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
          Text("Latest transaction").font(Font.system(size: 11, weight: .regular, design: .default)).foregroundColor(.textColorLightGray)
          Text(formattedLatestTransactionTime).lineLimit(1).foregroundColor(.textColor).font(Font.system(size:13, weight: .regular, design: .default)).minimumScaleFactor(0.01)
        }).padding()
      })
    }).background(Color.widgetBackground)
  }
  
  var MarketStack: some View {
    VStack(alignment: .leading, spacing:23 , content: {
      VStack(alignment: .leading, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
        Text("Market").font(.headline).foregroundColor(.textColor).bold()
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
          Text("Next Block").bold().lineLimit(1).font(Font.system(size:11, weight: .medium, design: .default)).foregroundColor(.textColor)
          Spacer()
          Text(entry.marketData.formattedNextBlock).padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4)).lineLimit(1).foregroundColor(.widgetBackground).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color(red: 0.29, green: 0.86, blue: 0.73)).overlay(
            RoundedRectangle(cornerRadius: 4.0)
              .stroke(Color.containerGreen, lineWidth: 4.0))
        })
        
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
          Text("Sats/Dollar").bold().lineLimit(1).font(Font.system(size:11, weight: .medium, design: .default)).foregroundColor(.textColor)
          Spacer()
          Text(entry.marketData.sats == "..." ? "..." : entry.marketData.sats).padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4)).lineLimit(1).foregroundColor(.widgetBackground).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color(red: 0.97, green: 0.21, blue: 0.38)).overlay(
            RoundedRectangle(cornerRadius: 4.0)
              .stroke(Color.containerRed, lineWidth: 4.0))
        })
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
          Text("Price").bold().lineLimit(1).font(Font.system(size:11, weight: . medium, design: .default)).foregroundColor(.textColor)
          Spacer()
          Text(entry.marketData.price == "..." ? "..." : entry.marketData.price).padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4)).lineLimit(1).foregroundColor(.widgetBackground).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color(red: 0.29, green: 0.86, blue: 0.73)).overlay(
            RoundedRectangle(cornerRadius:4.0)
              .stroke(Color.containerGreen, lineWidth: 4.0))
        })
      }).padding(EdgeInsets(top: 18, leading: 11, bottom: 18, trailing: 11))
    })
  }
  
  var body: some View {
      HStack(content: {
          WalletBalance
          MarketStack
      }).background(Color(.lightGray).opacity(0.77))
  }
}

@main
struct WalletInformationAndMarketWidget: Widget {
  let kind: String = "WalletInformationAndMarketWidget"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      WalletInformationAndMarketWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Wallet and Market")
    .description("View your total wallet balance and network prices.").supportedFamilies([.systemMedium])
  }
}

struct WalletInformationAndMarketWidget_Previews: PreviewProvider {
  static var previews: some View {
    WalletInformationAndMarketWidgetEntryView(entry: SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 0), allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: 1568804029000)))
      .previewContext(WidgetPreviewContext(family: .systemMedium))
  }
}
