import AppIntents
import SwiftUI

@available(iOS 16.0, *)
struct PriceIntent: AppIntent {
    static var title: LocalizedStringResource = "Market Rate"
    static var description = IntentDescription("View the current Bitcoin market rate.")
    static var parameterSummary: some ParameterSummary {
        Summary("View the current Bitcoin market rate.")
    }

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog & ShowsSnippetView {
        let userPreferredCurrency = Currency.getUserPreferredCurrency()
        if userPreferredCurrency != Currency.getLastSelectedCurrency() {
            Currency.saveNewSelectedCurrency()
        }

        var resultText = "--"
        var lastUpdated = "--"

        do {
            if let data = try await MarketAPI.fetchPrice(currency: userPreferredCurrency),
               let formattedRate = data.formattedRate {
                resultText = formattedRate
                let currentMarketData = MarketData(
                    nextBlock: "",
                    sats: "",
                    price: formattedRate,
                    rate: data.rateDouble,
                    dateString: data.lastUpdate
                )
                lastUpdated = formattedDate(from: data.lastUpdate)
            }
        } catch {
        }

        let view = CompactPriceView(price: resultText, lastUpdated: lastUpdated)

        return .result(
            value: resultText,
            dialog: "Current Bitcoin Market Rate",
            view: view
        )
    }

    private func formattedDate(from isoString: String) -> String {
        let isoFormatter = ISO8601DateFormatter()
        if let date = isoFormatter.date(from: isoString) {
            let formatter = DateFormatter()
            formatter.dateStyle = .none
            formatter.timeStyle = .short
            return formatter.string(from: date)
        }
        return "--"
    }
}

@available(iOS 15.0, *)
struct CompactPriceView: View {
    let price: String
    let lastUpdated: String

    var body: some View {
        VStack {
            Text(price)
                .font(.title)
            Text("at \(lastUpdated)")
            .font(.subheadline)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: 200)
        .padding()
    }
}
