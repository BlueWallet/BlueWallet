import SwiftUI
import WidgetKit

/// A lightweight host for the Apple Watch and Vision Pro widgets.
@main
struct MarketApp: App {
    var body: some Scene {
        WindowGroup {
            MarketAppView()
        }
    }
}

private struct MarketAppView: View {
    @AppStorage("preferredCurrency", store: UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue))
    private var currency = "USD"
    @State private var data = emptyMarketData
    @State private var status = "Loading market…"

    private var currencies: [String] {
        Bundle.main.decode([String: FiatUnit].self, from: "fiatUnits.json").keys.sorted()
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                MarketView(marketData: data, currency: currency)
                Text(status).font(.caption).foregroundStyle(.secondary)
                Picker("Currency", selection: $currency) {
                    ForEach(currencies, id: \.self) { Text($0).tag($0) }
                }
                Text("Add the Market widget from your widget gallery.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            .padding()
        }
        .task(id: currency) {
            data = emptyMarketData
            status = "Loading market…"
            WidgetCenter.shared.reloadTimelines(ofKind: "MarketWidget")
            do {
                let result = try await MarketAPI.fetchMarketData(currency: currency)
                guard !Task.isCancelled else { return }
                data = result
                status = "Updated at \(Date().formatted(date: .omitted, time: .shortened))"
            } catch {
                guard !Task.isCancelled else { return }
                status = "Market unavailable. Try again later."
            }
        }
    }
}
