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
        if context.isPreview {
            entry = MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000", rate: 10000))
        } else {
            entry = MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0))
        }
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let currentDate = Date()
        var entries: [MarketWidgetEntry] = []

        let marketDataEntry = MarketWidgetEntry(date: currentDate, marketData: MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0))
        entries.append(marketDataEntry) // Initial placeholder entry

        let userPreferredCurrency = Currency.getUserPreferredCurrency()
        fetchMarketDataWithRetry(currency: userPreferredCurrency, retries: 3) { marketData in
            let entry = MarketWidgetEntry(date: Date(), marketData: marketData)
            entries.append(entry)
            let timeline = Timeline(entries: entries, policy: .atEnd)
            completion(timeline)
        }
    }

    private func fetchMarketDataWithRetry(currency: String, retries: Int, completion: @escaping (MarketData) -> ()) {
        var attempt = 0

        func attemptFetch() {
            attempt += 1
            print("Attempt \(attempt) to fetch market data.")

            MarketAPI.fetchMarketData(currency: currency) { result in
                switch result {
                case .success(let marketData):
                    print("Successfully fetched market data on attempt \(attempt).")
                    completion(marketData)
                case .failure(let error):
                    print("Fetch market data failed (attempt \(attempt)): \(error.localizedDescription)")
                    if attempt < retries {
                        DispatchQueue.global().asyncAfter(deadline: .now() + 2) {
                            attemptFetch()
                        }
                    } else {
                        print("Failed to fetch market data after \(retries) attempts.")
                        let fallbackData = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
                        completion(fallbackData)
                    }
                }
            }
        }

        attemptFetch()
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
