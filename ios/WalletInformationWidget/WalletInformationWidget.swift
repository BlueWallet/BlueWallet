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
   
    let marketDataEntry = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
    let allwalletsBalance = WalletData(balance: UserDefaultsGroup.getAllWalletsBalance(), latestTransactionTime: UserDefaultsGroup.getAllWalletsLatestTransactionTime())
    WidgetAPI.fetchPrice(currency: userPreferredCurrency, completion: { (result, error) in
      let entry: SimpleEntry
      if let result = result {
        entry = SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "", sats: "", price: result.formattedRate ?? "!", rate: result.rateDoubleValue ?? 0), allWalletsBalance: allwalletsBalance)
        
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
            HStack(alignment: .top, content: {
              VStack(alignment: .leading, spacing: nil, content: {
                VStack(alignment: .leading, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
                  Text(entry.allWalletsBalance.formattedBalanceBTC).lineLimit(1).minimumScaleFactor(0.01).font(Font.system(size: 15, weight: .medium, design: .default)).foregroundColor(.textColorLightGray)
                  Text(formattedBalance).lineLimit(1).foregroundColor(.textColor).font(Font.system(size:28, weight: .bold, design: .default)).minimumScaleFactor(0.01)
                  
                })
              })
              Spacer()
            })
            Spacer()
            
            HStack(alignment: .top, content: {
              
              VStack(alignment: .leading, spacing: nil, content: {
                Text("Latest transaction").font(Font.system(size: 11, weight: .regular, design: .default)).foregroundColor(.textColorLightGray)
                Text(formattedLatestTransactionTime).lineLimit(1).foregroundColor(.textColor).font(Font.system(size:13, weight: .regular, design: .default)).minimumScaleFactor(0.01)
                
              })
              Spacer()
              
            })}).padding()
  }
  
  
  var body: some View {
    WalletBalance.background(Color.widgetBackground)
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
    WalletInformationWidgetEntryView(entry: SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: Double(13000)), allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: 1568804029000)))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
