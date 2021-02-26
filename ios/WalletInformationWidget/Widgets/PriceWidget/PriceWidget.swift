//
//  PriceWidget.swift
//  PriceWidget
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

var marketData: [MarketDataTimeline: MarketData?] = [ .Current: nil, .Previous: nil]
struct Provider: TimelineProvider {
  
  func placeholder(in context: Context) -> SimpleEntry {
    return SimpleEntry(date: Date(), currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"))
  }
  
  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
    let entry: SimpleEntry
    if (context.isPreview) {
      entry = SimpleEntry(date: Date(), currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"))
    } else {
      entry = SimpleEntry(date: Date(), currentMarketData: emptyMarketData)
    }
    completion(entry)
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [SimpleEntry] = []
    
    if WidgetAPI.getUserPreferredCurrency() != WidgetAPI.getLastSelectedCurrency() {
      marketData[.Current] = nil
      marketData[.Previous] = nil
      WidgetAPI.saveNewSelectedCurrency()
    }
    
    var entryMarketData = marketData[.Current] ?? emptyMarketData
    WidgetAPI.fetchPrice(currency: WidgetAPI.getUserPreferredCurrency()) { (data, error) in
      if let data = data, let formattedRate = data.formattedRate {
        let currentMarketData = MarketData(nextBlock: "", sats: "", price: formattedRate, rate: data.rateDouble, dateString: data.lastUpdate)
        if let cachedMarketData = marketData[.Current], currentMarketData.dateString != cachedMarketData?.dateString {
          marketData[.Previous] = marketData[.Current]
          marketData[.Current] = currentMarketData
          entryMarketData = currentMarketData
          entries.append(SimpleEntry(date:Date(), currentMarketData: entryMarketData))
        } else {
          entries.append(SimpleEntry(date:Date(), currentMarketData: currentMarketData))
        }
      }
      
      let timeline = Timeline(entries: entries, policy: .atEnd)
      completion(timeline)
    }
    
  }
}

struct SimpleEntry: TimelineEntry {
  let date: Date
  let currentMarketData: MarketData?
  var previousMarketData: MarketData? {
    return marketData[.Previous] as? MarketData
  }
}

struct PriceWidgetEntryView : View {
  var entry: Provider.Entry
  var priceView: some View {
    PriceView(currentMarketData: entry.currentMarketData, previousMarketData: marketData[.Previous] ?? emptyMarketData).padding()
  }
  
  var body: some View {
    VStack(content: {
      priceView
    }).background(Color.widgetBackground)
  }
}

@main
struct PriceWidget: Widget {
  let kind: String = "PriceWidget"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      PriceWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Price")
    .description("View the current price of Bitcoin.").supportedFamilies([.systemSmall])
  }
}

struct PriceWidget_Previews: PreviewProvider {
  static var previews: some View {
    PriceWidgetEntryView(entry: SimpleEntry(date: Date(), currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00")))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
