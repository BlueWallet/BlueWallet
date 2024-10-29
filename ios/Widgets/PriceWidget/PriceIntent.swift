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

        enum PriceIntentError: LocalizedError {
            case fetchFailed
            case invalidData
            
            var errorDescription: String? {
                switch self {
                case .fetchFailed:
                    return "Failed to fetch price data"
                case .invalidData:
                    return "Received invalid price data"
                }
            }
        }

        do {
            guard let data = try await MarketAPI.fetchPrice(currency: userPreferredCurrency) else {
                throw PriceIntentError.fetchFailed
            }

            resultValue = data.rateDouble
            lastUpdated = formattedDate(from: data.lastUpdate)

        } catch {
          throw PriceIntentError.fetchFailed
        }

        let formattedPrice = formatPrice(resultValue, currencyCode: currencyCode)

        let view = CompactPriceView(
          price: resultValue,
            lastUpdated: lastUpdated,
            currencyCode: currencyCode,
            dataSource: dataSource
        )

        return .result(
            value: data.rateDouble,
            dialog: "Current Bitcoin Market Rate",
            view: view
        )
    }

    private func formattedDate(from isoString: String?) -> String {
        guard let isoString = isoString else { return "--" }
        let isoFormatter = ISO8601DateFormatter()
        if let date = isoFormatter.date(from: isoString) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.timeStyle = .short
            return formatter.string(from: date)
        }
        return "--"
    }

    private func formatPrice(_ price: Double, currencyCode: String) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currencyCode
        formatter.locale = Locale.current

        // Omit cents if price is a whole number
        if price.truncatingRemainder(dividingBy: 1) == 0 {
            formatter.maximumFractionDigits = 0
            formatter.minimumFractionDigits = 0
        } else {
            formatter.maximumFractionDigits = 2
            formatter.minimumFractionDigits = 2
        }

        return formatter.string(from: NSNumber(value: price)) ?? "--"
    }
}


@available(iOS 16.0, *)
struct CompactPriceView: View {
    let price: String
    let lastUpdated: String
    let currencyCode: String
    let dataSource: String

    var body: some View {
        VStack(alignment: .center, spacing: 16) {
            Text(price)
                .font(.title)
                .bold()
                .multilineTextAlignment(.center)
                .dynamicTypeSize(.large ... .accessibility5)
                .accessibilityLabel("Bitcoin price: \(price)")

            VStack(alignment: .center, spacing: 4) {
                Text("Currency: \(currencyCode)")
                Text("Updated: \(lastUpdated)")
                Text("Source: \(dataSource)")
            }
            .font(.subheadline)
            .foregroundColor(.secondary)
            .multilineTextAlignment(.center)
            .accessibilityElement(children: .combine)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
}
