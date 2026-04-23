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

    static let previewData = MarketData(nextBlock: "26", sats: "9 134", price: "$10 000", rate: 10000)

    func placeholder(in context: Context) -> MarketWidgetEntry {
        MarketWidgetEntry(date: Date(), marketData: Self.previewData)
    }

    func getSnapshot(in context: Context, completion: @escaping (MarketWidgetEntry) -> ()) {
        if context.isPreview {
            completion(MarketWidgetEntry(date: Date(), marketData: Self.previewData))
            return
        }
        Task {
            let data = await WidgetDataLoader.shared.cachedMarketData()
            completion(MarketWidgetEntry(date: Date(), marketData: data))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        Task {
            let marketData = await WidgetDataLoader.shared.loadMarketData()
            let entry = MarketWidgetEntry(date: Date(), marketData: marketData)
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(900)))
            completion(timeline)
        }
    }
}

struct MarketWidgetEntry: TimelineEntry {
    let date: Date
    var marketData: MarketData
}

struct MarketWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: MarketWidgetEntry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            accessoryRectangularView
        default:
            MarketView(marketData: entry.marketData)
                .containerBackground(Color.widgetBackground, for: .widget)
        }
    }

    private var accessoryRectangularView: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Market")
                .font(.caption)
                .fontWeight(.bold)
            Text(entry.marketData.price)
                .font(.caption)
            Text(entry.marketData.formattedNextBlock)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .containerBackground(for: .widget) {
            AccessoryWidgetBackground()
        }
    }
}

struct MarketWidget: Widget {
    let kind: String = "MarketWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MarketWidgetProvider()) { entry in
            MarketWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Market")
        .description("View the current market information.")
        #if os(watchOS)
        .supportedFamilies([.accessoryRectangular])
        #else
        .supportedFamilies([.systemSmall])
        #endif
        .contentMarginsDisabled()
    }
}

#Preview("Market Widget", as: .systemSmall) {
    MarketWidget()
} timeline: {
    MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9,134", price: "$10,000", rate: 0))
}
