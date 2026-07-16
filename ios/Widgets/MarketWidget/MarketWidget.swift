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
    typealias Entry = MarketWidgetEntry

    func placeholder(in context: Context) -> MarketWidgetEntry {
        return MarketWidgetEntry(date: Date(), marketData: previewMarketData)
    }

    func getSnapshot(in context: Context, completion: @escaping (MarketWidgetEntry) -> ()) {
        let entry: MarketWidgetEntry
        if context.isPreview {
            entry = MarketWidgetEntry(date: Date(), marketData: previewMarketData)
        } else {
            entry = MarketWidgetEntry(date: Date(), marketData: WidgetMarketDataStore.loadFallback())
        }
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let userPreferredCurrency = Currency.getUserPreferredCurrency()
        Task {
            let marketData = await WidgetMarketDataLoader.load(currency: userPreferredCurrency)
            let entry = MarketWidgetEntry(date: Date(), marketData: marketData)
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
            completion(timeline)
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
