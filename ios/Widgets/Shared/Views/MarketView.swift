import SwiftUI
import WidgetKit

struct MarketView: View {
    var marketData: MarketData = emptyMarketData
    var currency: String = Currency.getUserPreferredCurrency()

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Bitcoin · \(currency)", systemImage: "bitcoinsign.circle.fill")
                .font(.caption.bold())
                .foregroundStyle(.secondary)
                .widgetAccentable()
            Text(marketData.price)
                .font(.title2.bold())
                .monospacedDigit()
                .minimumScaleFactor(0.6)
                .accessibilityLabel("Bitcoin price, \(marketData.price), \(currency)")
            Spacer(minLength: 0)
            metric("Sats/\(currency)", value: marketData.sats)
            metric("Next block", value: marketData.formattedNextBlock)
        }
        .foregroundStyle(.primary)
        .lineLimit(1)
    }

    private func metric(_ title: String, value: String) -> some View {
        HStack {
            Text(title).foregroundStyle(.secondary)
            Spacer(minLength: 4)
            Text(value).monospacedDigit().fontWeight(.semibold)
        }
        .font(.caption)
        .minimumScaleFactor(0.7)
        .accessibilityElement(children: .combine)
    }
}
