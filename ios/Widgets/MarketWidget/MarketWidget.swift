import SwiftUI
import WidgetKit

struct MarketWidgetEntry: TimelineEntry, Codable {
    let date: Date
    var marketData: MarketData
    var currency: String = Currency.getUserPreferredCurrency()
    var isStale: Bool = false
}

/// Keep the last successful quote across extension launches, separately for each currency.
struct MarketWidgetCache {
    var defaults: UserDefaults = .standard

    func entry(for currency: String) -> MarketWidgetEntry? {
        guard let data = defaults.data(forKey: "MarketWidget.\(currency)"),
              var entry = try? JSONDecoder().decode(MarketWidgetEntry.self, from: data),
              entry.currency == currency,
              entry.marketData.rate.isFinite, entry.marketData.rate > 0 else { return nil }
        entry.isStale = entry.isStale || Date().timeIntervalSince(entry.date) >= 60 * 60
        return entry
    }

    func save(_ entry: MarketWidgetEntry) {
        guard entry.marketData.rate.isFinite, entry.marketData.rate > 0,
              let data = try? JSONEncoder().encode(entry) else { return }
        defaults.set(data, forKey: "MarketWidget.\(entry.currency)")
    }
}

struct MarketWidgetProvider: TimelineProvider {
    var cache = MarketWidgetCache()

    func placeholder(in context: Context) -> MarketWidgetEntry {
        MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "1,000", price: "$100,000", rate: 100000), currency: "USD")
    }

    func getSnapshot(in context: Context, completion: @escaping (MarketWidgetEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) :
            cache.entry(for: Currency.getUserPreferredCurrency()) ?? unavailableEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MarketWidgetEntry>) -> Void) {
        let currency = Currency.getUserPreferredCurrency()
        MarketAPI.fetchMarketData(currency: currency) { result in
            completion(makeTimeline(result: result, currency: currency))
        }
    }

    func makeTimeline(result: Result<MarketData, Error>, currency: String, now: Date = Date()) -> Timeline<MarketWidgetEntry> {
        let entry: MarketWidgetEntry
        if case .success(let data) = result, data.rate.isFinite, data.rate > 0 {
            entry = MarketWidgetEntry(date: now, marketData: data, currency: currency)
            cache.save(entry)
        } else if var cached = cache.entry(for: currency) {
            cached.isStale = true
            entry = cached
        } else {
            entry = MarketWidgetEntry(date: now, marketData: MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0), currency: currency, isStale: true)
        }
        // WidgetKit schedules the actual refresh. Avoid an immediate .atEnd loop.
        let refresh = now.addingTimeInterval(entry.isStale ? 15 * 60 : 30 * 60)
        var entries = [entry]
        if !entry.isStale {
            // A future entry also marks the quote stale if the system defers our refresh.
            entries.append(MarketWidgetEntry(date: now.addingTimeInterval(60 * 60), marketData: entry.marketData, currency: currency, isStale: true))
        }
        return Timeline(entries: entries, policy: .after(refresh))
    }

    private func unavailableEntry(currency: String = Currency.getUserPreferredCurrency()) -> MarketWidgetEntry {
        MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0), currency: currency, isStale: true)
    }
}

struct MarketWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: MarketWidgetEntry

    var body: some View {
        content
            .containerBackground(Color.widgetBackground, for: .widget)
    }

    @ViewBuilder private var content: some View {
        #if !os(macOS) && !os(visionOS) && !targetEnvironment(macCatalyst)
        switch family {
        case .accessoryInline:
            Label("\(entry.marketData.price) · \(entry.currency)\(entry.isStale ? " · !" : "")", systemImage: "bitcoinsign")
        case .accessoryCircular:
            VStack(spacing: 2) {
                Image(systemName: entry.isStale ? "exclamationmark.triangle" : "bitcoinsign")
                    .widgetAccentable()
                Text(entry.marketData.rate > 0 ? entry.marketData.rate.abbreviated : "—")
                    .font(.caption.bold())
                Text(entry.currency).font(.caption2)
            }
            .minimumScaleFactor(0.7)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Bitcoin, \(entry.marketData.price), \(entry.currency)\(entry.isStale ? ", last available price" : "")")
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Label("Bitcoin · \(entry.currency)", systemImage: "bitcoinsign").font(.headline).widgetAccentable()
                Text(entry.marketData.price).font(.headline).monospacedDigit()
                Text(entry.isStale ? "Last available price" : "Next block: \(entry.marketData.formattedNextBlock)")
                    .font(.caption)
            }
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        default:
            marketContent
        }
        #else
        marketContent
        #endif
    }

    private var marketContent: some View {
        VStack(alignment: .leading, spacing: 6) {
            MarketView(marketData: entry.marketData, currency: entry.currency)
            if entry.isStale {
                Text(entry.marketData.rate > 0 ? "Last available price" : "Market unavailable")
                    .font(.caption2).foregroundStyle(.secondary)
            } else {
                Text(entry.date, style: .time)
                    .font(.caption2).foregroundStyle(.secondary)
                    .accessibilityLabel("Updated at \(entry.date.formatted(date: .omitted, time: .shortened))")
            }
        }
    }
}

struct MarketWidget: Widget {
    let kind = "MarketWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MarketWidgetProvider()) { entry in
            MarketWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Market")
        .description("Bitcoin price, sats per currency unit, and the next block fee estimate.")
        .supportedFamilies(Self.families)
    }

    static var families: [WidgetFamily] {
        #if os(watchOS)
        [.accessoryCircular, .accessoryInline, .accessoryRectangular]
        #elseif os(macOS) || os(visionOS) || targetEnvironment(macCatalyst)
        [.systemSmall, .systemMedium]
        #else
        [.systemSmall, .systemMedium, .accessoryCircular, .accessoryInline, .accessoryRectangular]
        #endif
    }
}

struct MarketWidget_Previews: PreviewProvider {
    static var previews: some View {
        ForEach(MarketWidget.families, id: \.self) { family in
            MarketWidgetEntryView(entry: MarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "1,000", price: "$100,000", rate: 100000), currency: "USD"))
                .previewContext(WidgetPreviewContext(family: family))
        }
    }
}
