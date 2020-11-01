//
//  MarketWidget.swift
//  MarketWidget
//
//  Created by Marcos Rodriguez on 10/29/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

let textColor = Color("TextColor")
let textColorLightGray = Color(red: 0.6, green: 0.63, blue: 0.67)
let emptyMarketData = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    SimpleEntry(date: Date(), marketData: emptyMarketData)
  }
  
  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
    let entry: SimpleEntry
    if (context.isPreview) {
      entry = SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000", rate: 10000), allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: 1568804029000))
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

struct MarketWidgetEntryView : View {
  var entry: Provider.Entry
  @Environment(\.widgetFamily) var family
  var formattedBalance: String {
      let numberFormatter = NumberFormatter()
      numberFormatter.locale = Locale(identifier: WidgetAPI.getUserPreferredCurrencyLocale())
      numberFormatter.numberStyle = .currency
      numberFormatter.numberStyle = .currency
    let amount = numberFormatter.string(from:  NSNumber(value: ((entry.allWalletsBalance.balance / 100000000) * entry.marketData.rate))) ?? ""
    return amount
  }
  var formattedLatestTransactionTime: String {
    let forDate = Date(timeIntervalSince1970: (TimeInterval(entry.allWalletsBalance.latestTransactionTime) / 1000))
      let dateFormatter = RelativeDateTimeFormatter()
    dateFormatter.locale = Locale(identifier: Locale.current.identifier)
    dateFormatter.dateTimeStyle = .numeric
    return dateFormatter.localizedString(for: forDate, relativeTo: Date())
  }
  
  var WalletBalance: some View {
    VStack(alignment: .leading, spacing:nil , content: {
      VStack(alignment: .leading, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
        Text(entry.allWalletsBalance.formattedBalanceBTC).font(Font.system(size: 15, weight: .medium, design: .default)).foregroundColor(textColorLightGray)
        Text(formattedBalance).lineLimit(1).foregroundColor(textColor).font(Font.system(size:28, weight: .bold, design: .default))
      }).padding()
      Spacer()
      VStack(content: {
        VStack(alignment: .leading, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
          Text("Latest transaction").font(Font.system(size: 11, weight: .regular, design: .default)).foregroundColor(textColorLightGray)
          Text(formattedLatestTransactionTime).lineLimit(1).foregroundColor(textColor).font(Font.system(size:13, weight: .regular, design: .default))
        }).padding()
      })
    }).background(Color("WidgetBackground"))
  }
  
  var MarketStack: some View {
    VStack(alignment: .leading, spacing:23 , content: {
      VStack(alignment: .leading, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
        Text("Market").font(.headline).foregroundColor(textColor).bold()
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
          Text("Next Block").bold().lineLimit(1).font(Font.system(size:11, weight: .medium, design: .default)).foregroundColor(textColor)
          Spacer()
          Text(entry.marketData.formattedNextBlock).padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4)).lineLimit(1).foregroundColor(.white).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color(red: 0.29, green: 0.86, blue: 0.73)).overlay(
            RoundedRectangle(cornerRadius: 4.0)
              .stroke(Color(red: 0.29, green: 0.86, blue: 0.73), lineWidth: 4.0))
        })
        
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
          Text("Sats/Dollar").bold().lineLimit(1).font(Font.system(size:11, weight: .medium, design: .default)).foregroundColor(textColor)
          Spacer()
          Text(entry.marketData.sats == "..." ? "..." : entry.marketData.sats).padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4)).lineLimit(1).foregroundColor(.white).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color(red: 0.97, green: 0.21, blue: 0.38)).overlay(
            RoundedRectangle(cornerRadius: 4.0)
              .stroke(Color(red: 0.97, green: 0.21, blue: 0.38), lineWidth: 4.0))
        })
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
          Text("Price").bold().lineLimit(1).font(Font.system(size:11, weight: . medium, design: .default)).foregroundColor(textColor)
          Spacer()
          Text(entry.marketData.price == "..." ? "..." : entry.marketData.price).padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4)).lineLimit(1).foregroundColor(.white).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color(red: 0.29, green: 0.86, blue: 0.73)).overlay(
            RoundedRectangle(cornerRadius:4.0)
              .stroke(Color(red: 0.29, green: 0.86, blue: 0.73), lineWidth: 4.0))
        })
      }).padding(EdgeInsets(top: 18, leading: 11, bottom: 18, trailing: 11))
    })
  }
  
  var body: some View {
    switch family {
    case .systemMedium:
      HStack(content: {
          WalletBalance
          MarketStack
      }).background(Color(.lightGray).opacity(0.77))
    default:
      MarketStack.background(Color("WidgetBackground"))
    }
  }
}

@main
struct MarketWidget: Widget {
  let kind: String = "MarketWidget"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      MarketWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Market")
    .description("Stay up to date with network prices.").supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct MarketWidget_Previews: PreviewProvider {
  static var previews: some View {
    MarketWidgetEntryView(entry: SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 0), allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: 1568804029000)))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
    MarketWidgetEntryView(entry: SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000), allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: 1568804029000)))
      .previewContext(WidgetPreviewContext(family: .systemMedium))
  }
}


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
