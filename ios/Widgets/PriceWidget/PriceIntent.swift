//
//  PriceIntent.swift
//  BlueWallet
//

import AppIntents
import SwiftUI

@available(iOS 16.0, *)
struct PriceIntent: AppIntent {
    // MARK: - Intent Metadata
    
    static var title: LocalizedStringResource = "Market Rate"
    static var description = IntentDescription("View the current Bitcoin market rate in your preferred currency.")
    static var openAppWhenRun: Bool { false }

    // MARK: - Parameters
    
    @Parameter(
        title: "Currency",
        description: "Choose your preferred currency."
    )
    var fiatCurrency: FiatUnitEnum?

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<Double> & ProvidesDialog & ShowsSnippetView {
        if let fiat = fiatCurrency {
            print("Received fiatCurrency parameter: \(fiat.rawValue)")
        } else {
            print("fiatCurrency parameter not provided. Proceeding with fallback logic.")
        }
        
        // Determine the fiat currency to use:
        // 1. Use the fiatCurrency parameter if provided
        // 2. Fallback to Shared Group UserDefaults
        // 3. Fallback to Device's preferred currency
        // 4. Default to USD
        let selectedFiatCurrency: FiatUnitEnum
        
        if let fiat = fiatCurrency {
            selectedFiatCurrency = fiat
            print("Using fiatCurrency parameter: \(selectedFiatCurrency.rawValue)")
        } else if let sharedCurrencyCode = getSharedCurrencyCode(),
                  let fiat = FiatUnitEnum(rawValue: sharedCurrencyCode.uppercased()) {
            selectedFiatCurrency = fiat
            print("Using shared user default currency: \(selectedFiatCurrency.rawValue)")
        } else if let deviceCurrencyCode = Locale.current.currencyCode,
                  let fiat = FiatUnitEnum(rawValue: deviceCurrencyCode.uppercased()) {
            selectedFiatCurrency = fiat
            print("Using device's currency: \(selectedFiatCurrency.rawValue)")
        } else {
            selectedFiatCurrency = .USD
            print("Defaulting to USD.")
        }
        
        let dataSource = selectedFiatCurrency.source
        print("Data Source: \(dataSource)")

        var lastUpdated = "--"
        var priceDouble: Double = 0.0

        do {
            guard let fetchedData = try await MarketAPI.fetchPrice(currency: selectedFiatCurrency.rawValue) else {
                print("Failed to fetch price data.")
                throw NSError(
                    domain: "PriceIntentErrorDomain",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to fetch price data."]
                )
            }

            priceDouble = fetchedData.rateDouble
            lastUpdated = formattedDate(from: fetchedData.lastUpdate)
            print("Fetched Price: \(priceDouble)")
            print("Last Updated: \(lastUpdated)")

        } catch {
            print("Error fetching price data: \(error.localizedDescription)")
            let errorView = CompactPriceView(
                price: "N/A",
                lastUpdated: "--",
                code: selectedFiatCurrency.rawValue,
                dataSource: "Error fetching data"
            )

            return .result(
                value: 0.0,
                dialog: "Failed to retrieve the Bitcoin market rate.",
                view: errorView
            )
        }

        let formattedPrice = formatPrice(priceDouble, currencyCode: selectedFiatCurrency.rawValue)
        let currencySymbol = getCurrencySymbol(for: selectedFiatCurrency.rawValue)

        let view = CompactPriceView(
            price: formattedPrice,
            lastUpdated: lastUpdated,
            code: selectedFiatCurrency.rawValue,
            dataSource: dataSource
        )

        print("Formatted Price: \(formattedPrice)")
        print("Currency Symbol: \(currencySymbol)")

        return .result(
            value: priceDouble,
            dialog: "Current Bitcoin Market Rate",
            view: view
        )
    }

    // MARK: - Helper Methods
    
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
        formatter.locale = Locale.current // Use device's current locale
        formatter.currencyCode = currencyCode
        
        // Omit cents if price is a whole number
        if price.truncatingRemainder(dividingBy: 1) == 0 {
            formatter.maximumFractionDigits = 0
            formatter.minimumFractionDigits = 0
        } else {
            formatter.maximumFractionDigits = 2
            formatter.minimumFractionDigits = 2
        }

        guard let formattedNumber = formatter.string(from: NSNumber(value: price)) else {
            return "\(price)"
        }

        return formattedNumber
    }
    
    private func getCurrencySymbol(for currencyCode: String) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale.current // Use device's current locale
        formatter.currencyCode = currencyCode
        return formatter.currencySymbol
    }
    
    private func getSharedCurrencyCode() -> String? {
        let sharedDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
        return sharedDefaults?.string(forKey: UserDefaultsGroupKey.PreferredCurrency.rawValue)
    }
}
