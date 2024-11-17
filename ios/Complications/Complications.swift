//
//  Complications.swift
//  Complications
//
//

import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct ComplicationProvider: TimelineProvider {
    static var lastSuccessfulEntry: ComplicationEntry?

    func placeholder(in context: Context) -> ComplicationEntry {
        ComplicationEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000, dateString: ""))
    }

    func getSnapshot(in context: Context, completion: @escaping (ComplicationEntry) -> ()) {
        let entry: ComplicationEntry
        if context.isPreview {
            entry = ComplicationEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000, dateString: ""))
        } else {
            entry = ComplicationEntry(date: Date(), marketData: emptyMarketData)
        }
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ComplicationEntry>) -> ()) {
        var entries: [ComplicationEntry] = []
        if context.isPreview {
            let entry = ComplicationEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000, dateString: ""))
            entries.append(entry)
            let timeline = Timeline(entries: entries, policy: .atEnd)
            completion(timeline)
        } else {
            let userPreferredCurrency = Currency.getUserPreferredCurrency()
            MarketAPI.fetchExchangeRateData(currency: userPreferredCurrency) { (result, error) in
                let entry: ComplicationEntry

                if let result = result {
                    entry = ComplicationEntry(date: Date(), marketData: result)
                    ComplicationProvider.lastSuccessfulEntry = entry
                } else {
                    // Use the last successful entry if available
                    if let lastEntry = ComplicationProvider.lastSuccessfulEntry {
                        entry = lastEntry
                    } else {
                        // Fallback to a default entry if no successful entry is available
                        entry = ComplicationEntry(date: Date(), marketData: emptyMarketData)
                    }
                }
                entries.append(entry)
                let timeline = Timeline(entries: entries, policy: .atEnd)
                completion(timeline)
            }
        }
    }
}

// MARK: - Timeline Entry

struct ComplicationEntry: TimelineEntry {
    let date: Date
    var marketData: MarketData
}

// MARK: - SwiftUI View

struct ComplicationEntryView : View {
    var entry: ComplicationProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            accessoryCircularView
        case .accessoryInline:
            accessoryInlineView
        case .accessoryRectangular:
            accessoryRectangularView
        case .accessoryCorner:
            accessoryCornerView
        default:
            EmptyView()
        }
    }

    // MARK: - Accessory Circular View
    private var accessoryCircularView: some View {
        VStack(alignment: .center, spacing: 4) {
            Text("BTC")
                .font(.caption)
                .minimumScaleFactor(0.1)
            Text(formattedPriceString(from: entry.marketData.rate))
                .font(.body)
                .minimumScaleFactor(0.1)
                .lineLimit(1)
        }
        .widgetURL(URL(string: "bluewallet://marketprice"))
    }

    // MARK: - Accessory Inline View
    private var accessoryInlineView: some View {
        HStack {
            Text(formattedCurrencyString(from: entry.marketData.rate))
                .font(.body)
                .minimumScaleFactor(0.1)
        }
    }

    // MARK: - Accessory Rectangular View
    private var accessoryRectangularView: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Bitcoin (\(Currency.getUserPreferredCurrency()))")
                .font(.caption)
                .foregroundColor(.secondary)
            HStack {
                Text(formattedCurrencyString(from: entry.marketData.rate))
                    .font(.caption)
                    .fontWeight(.bold)
            }
            Text("at \(formattedDate(from: entry.date))")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.all, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.widgetBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .widgetURL(URL(string: "bluewallet://marketprice"))
    }

    // MARK: - Accessory Corner View
    private var accessoryCornerView: some View {
        Text("\(entry.marketData.price)")
            .font(.caption)
            .foregroundColor(.primary)
            .widgetURL(URL(string: "bluewallet://marketprice"))
    }

    // MARK: - Formatting Functions
    private func formattedPriceString(from rate: Double) -> String {
        let numberFormatter = NumberFormatter()
        numberFormatter.numberStyle = .decimal
        numberFormatter.maximumFractionDigits = 0
        return numberFormatter.string(from: NSNumber(value: rate)) ?? "--"
    }

    private func formattedCurrencyString(from rate: Double) -> String {
        let numberFormatter = NumberFormatter()
        numberFormatter.maximumFractionDigits = 0
        numberFormatter.numberStyle = .currency
        numberFormatter.currencySymbol = try? FiatUnit.fiatUnit(for: Currency.getUserPreferredCurrency())?.symbol ?? "$"
        return numberFormatter.string(from: NSNumber(value: rate)) ?? "--"
    }

    private func formattedDate(from date: Date) -> String {
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .short
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

// MARK: - Widget Configuration

@main
struct Complications: Widget {
    let kind: String = "Complications"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ComplicationProvider()) { entry in
            ComplicationEntryView(entry: entry)
        }
        .configurationDisplayName("Market Price")
        .description("Displays the current market price of Bitcoin.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryInline,
            .accessoryRectangular,
            .accessoryCorner
        ])
    }
}

// MARK: - Previews

struct Complications_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Accessory Circular Preview
            ComplicationEntryView(entry: ComplicationEntry(
                date: Date(),
                marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000, dateString: "2024-04-27T10:00:00Z")
            ))
            .previewContext(WidgetPreviewContext(family: .accessoryCircular))
            .previewDisplayName("Accessory Circular")
            
            // Accessory Inline Preview
            ComplicationEntryView(entry: ComplicationEntry(
                date: Date(),
                marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$15,000", rate: 15000, dateString: "2024-04-27T10:05:00Z")
            ))
            .previewContext(WidgetPreviewContext(family: .accessoryInline))
            .previewDisplayName("Accessory Inline")
            
            // Accessory Rectangular Preview
            ComplicationEntryView(entry: ComplicationEntry(
                date: Date(),
                marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$20,000", rate: 20000, dateString: "2024-04-27T10:10:00Z")
            ))
            .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
            .previewDisplayName("Accessory Rectangular")
            
            // Accessory Corner Preview
            ComplicationEntryView(entry: ComplicationEntry(
                date: Date(),
                marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$25,000", rate: 25000, dateString: "2024-04-27T10:15:00Z")
            ))
            .previewContext(WidgetPreviewContext(family: .accessoryCorner))
            .previewDisplayName("Accessory Corner")
        }
    }
}
