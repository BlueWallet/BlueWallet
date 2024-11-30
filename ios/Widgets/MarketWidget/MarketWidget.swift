//
//  MarketWidget.swift
//  MarketWidget
//
//  Created by Marcos Rodriguez on 11/6/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

struct MarketWidgetProvider: TimelineProvider {
  static var lastSuccessfulEntry: MarketWidgetEntry?

  func placeholder(in context: Context) -> MarketWidgetEntry {
    return MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000", rate: 10000))
  }
  
  func getSnapshot(in context: Context, completion: @escaping (MarketWidgetEntry) -> ()) {
    let entry: MarketWidgetEntry
    if (context.isPreview) {
      entry = MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000", rate: 10000))
    } else {
      entry = MarketWidgetEntry(date: Date(), marketData: emptyMarketData)
    }
    completion(entry)
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
      var entries: [MarketWidgetEntry] = []
      if context.isPreview {
        let entry = MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000", rate: 10000))
        entries.append(entry)
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
      } else {
          let userPreferredCurrency = Currency.getUserPreferredCurrency()
          fetchMarketDataWithRetry(currency: userPreferredCurrency, retries: 3) { (entry) in
              entries.append(entry)
              let timeline = Timeline(entries: entries, policy: .atEnd)
              completion(timeline)
          }
      }
  }

  private func fetchMarketDataWithRetry(currency: String, retries: Int, completion: @escaping (MarketWidgetEntry) -> ()) {
      MarketAPI.fetchMarketData(currency: currency) { (result, error) in
          if let result = result {
              let entry = MarketWidgetEntry(date: Date(), marketData: result)
              MarketWidgetProvider.lastSuccessfulEntry = entry
              completion(entry)
          } else if retries > 0 {
              DispatchQueue.global().asyncAfter(deadline: .now() + 2) {
                  self.fetchMarketDataWithRetry(currency: currency, retries: retries - 1, completion: completion)
              }
          } else {
              if let lastEntry = MarketWidgetProvider.lastSuccessfulEntry {
                  completion(lastEntry)
              } else {
                  let entry = MarketWidgetEntry(date: Date(), marketData: emptyMarketData)
                  completion(entry)
              }
          }
      }
  }
}

struct MarketWidgetEntry: TimelineEntry {
  let date: Date
  let marketData: MarketData
}

struct MarketWidgetEntryView : View {
  var entry: MarketWidgetProvider.Entry
  
  var MarketStack: some View {
    MarketView(marketData: entry.marketData).padding(EdgeInsets(top: 18, leading: 11, bottom: 18, trailing: 11))
  }
  
  var body: some View {
    VStack(content: {
      MarketStack.background(Color.widgetBackground)
    })
  }
}

struct MarketWidget: Widget {
  let kind: String = "MarketWidget"
  
  var body: some WidgetConfiguration {
    if #available(iOSApplicationExtension 16.0, *) {
      return StaticConfiguration(kind: kind, provider: MarketWidgetProvider()) { entry in
        MarketWidgetEntryView(entry: entry)
      }
      .configurationDisplayName("Market")
      .description("View the current market information.").supportedFamilies([.systemSmall])
      .contentMarginsDisabledIfAvailable()
    } else {
      return StaticConfiguration(kind: kind, provider: MarketWidgetProvider()) { entry in
        MarketWidgetEntryView(entry: entry)
      }
      .configurationDisplayName("Market")
      .description("View the current market information.").supportedFamilies([.systemSmall])
      .contentMarginsDisabledIfAvailable()
    }
  }
}

struct MarketWidget_Previews: PreviewProvider {
  static var previews: some View {
    MarketWidgetEntryView(entry: MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 0)))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
