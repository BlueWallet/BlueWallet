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
    private let refreshInterval: TimeInterval = 15 * 60

    func placeholder(in context: Context) -> MarketWidgetEntry {
        return MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000", rate: 10000))
    }

    func getSnapshot(in context: Context, completion: @escaping (MarketWidgetEntry) -> ()) {
        let entry: MarketWidgetEntry
        if context.isPreview {
            entry = MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000", rate: 10000))
        } else {
            entry = MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0))
        }
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let userPreferredCurrency = Currency.getUserPreferredCurrency()
        Task {
            let marketData: MarketData
            do {
                marketData = try await MarketAPI.fetchMarketData(currency: userPreferredCurrency)
            } catch {
                marketData = placeholder(in: context).marketData
            }

            let now = Date()
            let entry = MarketWidgetEntry(date: now, marketData: marketData)
            completion(Timeline(entries: [entry], policy: .after(now.addingTimeInterval(refreshInterval))))
        }
    }
}

struct MarketWidgetEntry: TimelineEntry {
    let date: Date
    var marketData: MarketData
}

struct MarketWidgetEntryView: View {
    var entry: MarketWidgetEntry

 var MarketStack: some View {
    MarketView(marketData: entry.marketData)
  }
  
  var body: some View {
    VStack(content: {
      MarketStack.containerBackground(Color.widgetBackground, for: .widget)
    })
  }
}

struct MarketWidget: Widget {
    let kind: String = "MarketWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MarketWidgetProvider()) { entry in
            MarketWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Market")
        .description("View the current market information.").supportedFamilies([.systemSmall])
    }
}

struct MarketWidget_Previews: PreviewProvider {
    static var previews: some View {
        MarketWidgetEntryView(entry: MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9,134", price: "$10,000", rate: 0)))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
