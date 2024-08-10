//
//  PriceWidget.swift
//  PriceWidget
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

struct PriceWidgetProvider: TimelineProvider {
  typealias Entry = PriceWidgetEntry
  static var lastSuccessfulEntry: PriceWidgetEntry?
  
  func placeholder(in context: Context) -> PriceWidgetEntry {
    return PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData)
  }
  
  func getSnapshot(in context: Context, completion: @escaping (PriceWidgetEntry) -> ()) {
    let entry: PriceWidgetEntry
    if context.isPreview {
      entry = PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData)
    } else {
      entry = PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: emptyMarketData, previousMarketData: emptyMarketData)
    }
    completion(entry)
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [PriceWidgetEntry] = []
    
    if context.isPreview {
      let entry = PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData)
      entries.append(entry)
      let timeline = Timeline(entries: entries, policy: .atEnd)
      completion(timeline)
    } else {
      let userPreferredCurrency = Currency.getUserPreferredCurrency()
      if userPreferredCurrency != Currency.getLastSelectedCurrency() {
        Currency.saveNewSelectedCurrency()
      }
      
      MarketAPI.fetchPrice(currency: userPreferredCurrency) { (data, error) in
        if let data = data, let formattedRate = data.formattedRate {
          let currentMarketData = MarketData(nextBlock: "", sats: "", price: formattedRate, rate: data.rateDouble, dateString: data.lastUpdate)
          
          // Retrieve previous market data from the last entry, if available
          let previousEntry = PriceWidgetProvider.lastSuccessfulEntry
          let previousMarketData = previousEntry?.currentMarketData

          // Check if the new fetched price is the same as the current price
          if let previousMarketData = previousMarketData, previousMarketData.rate == currentMarketData.rate {
            // If the new price is the same, only update the date
            let updatedEntry = PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: previousMarketData, previousMarketData: previousEntry?.previousMarketData ?? emptyMarketData)
            PriceWidgetProvider.lastSuccessfulEntry = updatedEntry
            entries.append(updatedEntry)
          } else {
            // If the new price is different, update the data
            let entry = PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: currentMarketData, previousMarketData: previousMarketData ?? emptyMarketData)
            PriceWidgetProvider.lastSuccessfulEntry = entry
            entries.append(entry)
          }
        } else {
          // Use the last successful entry if available
          if let lastEntry = PriceWidgetProvider.lastSuccessfulEntry {
            entries.append(lastEntry)
          } else {
            // Fallback to a default entry if no successful entry is available
            let entry = PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: emptyMarketData, previousMarketData: emptyMarketData)
            entries.append(entry)
          }
        }
        
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
      }
    }
  }
}

struct PriceWidgetEntry: TimelineEntry {
  let date: Date
  let family: WidgetFamily
  let currentMarketData: MarketData?
  let previousMarketData: MarketData?
}

struct PriceWidgetEntryView : View {
  let entry: PriceWidgetEntry

  @ViewBuilder
  var body: some View {
    PriceView(entry: entry)
  }
}

struct PriceWidget: Widget {
  let kind: String = "PriceWidget"
  
  var body: some WidgetConfiguration {
    if #available(iOSApplicationExtension 16.0, *) {
      return StaticConfiguration(kind: kind, provider: PriceWidgetProvider()) { entry in
        PriceWidgetEntryView(entry: entry)
      }
      .configurationDisplayName("Price")
      .description("View the current price of Bitcoin.")
      .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryInline, .accessoryRectangular])
      .contentMarginsDisabledIfAvailable()
    } else {
      return StaticConfiguration(kind: kind, provider: PriceWidgetProvider()) { entry in
        PriceWidgetEntryView(entry: entry)
      }
      .configurationDisplayName("Price")
      .description("View the current price of Bitcoin.")
      .supportedFamilies([.systemSmall])
      .contentMarginsDisabledIfAvailable()
    }
  }
}

struct PriceWidget_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      PriceWidgetEntryView(entry: PriceWidgetEntry(date: Date(), family: .systemSmall, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
      if #available(iOSApplicationExtension 16.0, *) {
        PriceWidgetEntryView(entry: PriceWidgetEntry(date: Date(), family: .accessoryCircular, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData))
          .previewContext(WidgetPreviewContext(family: .accessoryCircular))
        PriceWidgetEntryView(entry: PriceWidgetEntry(date: Date(), family: .accessoryInline, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData))
          .previewContext(WidgetPreviewContext(family: .accessoryInline))
        PriceWidgetEntryView(entry: PriceWidgetEntry(date: Date(), family: .accessoryRectangular, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData))
          .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
      }
    }
  }
}
