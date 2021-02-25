//
//  MarketWidget.swift
//  MarketWidget
//
//  Created by Marcos Rodriguez on 11/6/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    return SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000", rate: 10000))
  }
  
  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
    let entry: SimpleEntry
    if (context.isPreview) {
      entry = SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000", rate: 10000))
    } else {
      entry = SimpleEntry(date: Date(), marketData: emptyMarketData)
    }
    completion(entry)
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [SimpleEntry] = []
    let userPreferredCurrency = WidgetAPI.getUserPreferredCurrency();
    let marketDataEntry = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
    WidgetAPI.fetchMarketData(currency: userPreferredCurrency, completion: { (result, error) in
      let entry: SimpleEntry
      if let result = result {
        entry = SimpleEntry(date: Date(), marketData: result)
        
      } else {
        entry = SimpleEntry(date: Date(), marketData: marketDataEntry)
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
}

struct MarketWidgetEntryView : View {
  var entry: Provider.Entry
  
  var MarketStack: some View {
    MarketView(marketData: entry.marketData).padding(EdgeInsets(top: 18, leading: 11, bottom: 18, trailing: 11))
  }
  
  var body: some View {
    VStack(content: {
      MarketStack.background(Color.widgetBackground)
    })
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
    .description("View the current market information.").supportedFamilies([.systemSmall])
  }
}

struct MarketWidget_Previews: PreviewProvider {
  static var previews: some View {
    MarketWidgetEntryView(entry: SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 0)))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
