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
    static var description = IntentDescription("View the current Bitcoin market rate in your preferred fiat currency.")
    static var openAppWhenRun: Bool { false }

    // MARK: - Parameters
    
    @Parameter(
        title: "Currency"
    )
    var fiatCurrency: FiatUnitEnum?
        
    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<Double> & ProvidesDialog & ShowsSnippetView {
        // Determine the fiat currency to use:
        // 1. UserDefaults in Shared Group
        // 2. Device's preferred currency
        // 3. Default to USD
        let selectedFiatCurrency: FiatUnitEnum
        
        if let sharedCurrencyCode = getSharedCurrencyCode(),
           let fiat = FiatUnitEnum(rawValue: sharedCurrencyCode.uppercased()) {
            selectedFiatCurrency = fiat
        } else if let preferredCurrencyCode = Locale.current.currencyCode,
                  let fiat = FiatUnitEnum(rawValue: preferredCurrencyCode.uppercased()) {
            selectedFiatCurrency = fiat
        } else {
            selectedFiatCurrency = .USD
        }
        
        let dataSource = selectedFiatCurrency.source

        var lastUpdated = "--"
        var priceDouble: Double = 0.0

        do {
            guard let fetchedData = try await MarketAPI.fetchPrice(currency: selectedFiatCurrency.rawValue) else {
                throw NSError(
                    domain: "PriceIntentErrorDomain",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to fetch price data."]
                )
            }

            priceDouble = fetchedData.rateDouble
            lastUpdated = formattedDate(from: fetchedData.lastUpdate)

        } catch {
            let errorView = CompactPriceView(
                price: "N/A",
                lastUpdated: "--",
                currencySymbol: getCurrencySymbol(for: selectedFiatCurrency.rawValue),
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
            currencySymbol: currencySymbol,
            dataSource: dataSource
        )

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
        formatter.currencyCode = currencyCode
        return formatter.currencySymbol
    }
    
    private func getSharedCurrencyCode() -> String? {
      let sharedDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
        return sharedDefaults?.string(forKey: "selectedFiatCurrency")
    }
}
