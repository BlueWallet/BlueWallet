//
//  WalletInformationWidget.swift
//  WalletInformationWidget
//
//  Created by Marcos Rodriguez on 10/29/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    return SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000), allWalletsBalance: WalletData(balance: 1000000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)))
  }
  
  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
    let entry: SimpleEntry
    if (context.isPreview) {
      entry = SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000), allWalletsBalance: WalletData(balance: 1000000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)))
    } else {
      entry = SimpleEntry(date: Date(), marketData: emptyMarketData)
    }
    completion(entry)
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [SimpleEntry] = []
    let userPreferredCurrency = WidgetAPI.getUserPreferredCurrency();
    
    let marketDataEntry = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
    let allwalletsBalance = WalletData(balance: UserDefaultsGroup.getAllWalletsBalance(), latestTransactionTime: UserDefaultsGroup.getAllWalletsLatestTransactionTime())
    WidgetAPI.fetchPrice(currency: userPreferredCurrency, completion: { (result, error) in
      let entry: SimpleEntry
      if let result = result {
        entry = SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "", sats: "", price: result.formattedRate ?? "!", rate: result.rateDouble), allWalletsBalance: allwalletsBalance)
        
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

struct WalletInformationWidgetEntryView : View {
  var entry: Provider.Entry
  
  var WalletBalance: some View {
    WalletInformationView(allWalletsBalance: entry.allWalletsBalance, marketData: entry.marketData)
  }
  
  var body: some View {
    VStack(content: {
      WalletBalance
    }).padding().background(Color.widgetBackground)
  }
}

@main
struct WalletInformationWidget: Widget {
  let kind: String = "WalletInformationWidget"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      WalletInformationWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Wallets")
    .description("View your total wallet balance.").supportedFamilies([.systemSmall])
  }
}

struct WalletInformationWidget_Previews: PreviewProvider {
  static var previews: some View {
    WalletInformationWidgetEntryView(entry: SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: Double(0)), allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000))))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
