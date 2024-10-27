import AppIntents
import SwiftUI

@available(iOS 16.0, *)
struct PriceIntent: AppIntent {
    static var title: LocalizedStringResource = "Market Rate"
    static var description = IntentDescription("View the current Bitcoin market rate.")
    static var openAppWhenRun: Bool { false }

    static var parameterSummary: some ParameterSummary {
        Summary("View the current Bitcoin market rate.")
    }

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<Double> & ProvidesDialog & ShowsSnippetView {
        let userPreferredCurrency = Currency.getUserPreferredCurrency()
        let currencyCode = userPreferredCurrency.uppercased()
        let dataSource = fiatUnit(currency: userPreferredCurrency)?.source ?? "Unknown Source"

        if userPreferredCurrency != Currency.getLastSelectedCurrency() {
            Currency.saveNewSelectedCurrency()
        }

        var lastUpdated = "--"
        var resultValue: Double = 0.0

        do {
            guard let data = try await MarketAPI.fetchPrice(currency: userPreferredCurrency) else {
                throw NSError(domain: "PriceIntentErrorDomain", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch price data."])
            }

            resultValue = data.rateDouble
            lastUpdated = formattedDate(from: data.lastUpdate)

        } catch {
            throw error
        }

        let view = CompactPriceView(
            price: resultValue,
            lastUpdated: lastUpdated,
            currencyCode: currencyCode,
            dataSource: dataSource
        )

        return .result(
            value: resultValue,
            dialog: "Current Bitcoin Market Rate",
            view: view
        )
    }

    private func formattedDate(from isoString: String?) -> String {
        guard let isoString = isoString else { return "--" }
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

@available(iOS 16.0, *)
struct CompactPriceView: View {
    let price: Double
    let lastUpdated: String
    let currencyCode: String
    let dataSource: String

    var body: some View {
        VStack {
            Text(priceFormatted)
                .font(.title)
            Text(detailsText)
                .font(.caption)
                .foregroundColor(.gray)
                .padding(.top, 8)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: 200)
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(10)
    }

    private var priceFormatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currencyCode
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: price)) ?? "--"
    }

    private var detailsText: String {
        "\(lastUpdated) - \(currencyCode) - \(dataSource)"
    }
}
