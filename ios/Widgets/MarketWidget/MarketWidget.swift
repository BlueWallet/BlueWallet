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

        var marketDataEntry = MarketWidgetEntry(date: currentDate, marketData: MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0))
        entries.append(marketDataEntry) // Initial entry with no data

        Task {
            let userPreferredCurrency = Currency.getUserPreferredCurrency()
            let entry = await fetchMarketDataWithRetry(currency: userPreferredCurrency, retries: 3)
            entries.append(entry)

            let timeline = Timeline(entries: entries, policy: .atEnd)
            completion(timeline)
        }
    }

    private func fetchMarketDataWithRetry(currency: String, retries: Int) async -> MarketWidgetEntry {
        var marketData = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)

        for attempt in 0..<retries {
            do {
                print("Attempt \(attempt + 1) to fetch market data.")
                let fetchedData = try await fetchMarketData(currency: currency)
                marketData = fetchedData
                print("Successfully fetched market data on attempt \(attempt + 1).")
                break
            } catch {
                print("Fetch market data failed (attempt \(attempt + 1)): \(error.localizedDescription)")
                try? await Task.sleep(nanoseconds: UInt64(2 * 1_000_000_000)) // Wait 2 seconds before retrying
            }
        }

        let marketDataEntry = MarketWidgetEntry(date: Date(), marketData: marketData)
        return marketDataEntry
    }

    private func fetchMarketData(currency: String) async throws -> MarketData {
        let marketData = try await MarketAPI.fetchMarketData(currency: currency)
        return marketData
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
