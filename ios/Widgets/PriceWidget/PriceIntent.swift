//
//  PriceIntent.swift
//  BlueWallet
//

import Foundation
import AppIntents
import SwiftUI

// MARK: - Error Types

private enum PriceIntentError: LocalizedError {
    case noPriceData
    case invalidRate
    
    var errorDescription: String? {
        switch self {
        case .noPriceData:
            return "No Bitcoin price data was returned"
        case .invalidRate:
            return "Received an invalid Bitcoin price"
        }
    }
}

// MARK: - Price Data Model

private struct PriceData {
    let rate: Double
    let lastUpdate: String
    let formattedPrice: String
    let currencyCode: String
    let dataSource: String
}

@available(iOS 16.0, *)
struct PriceIntent: AppIntent {
    // MARK: - Intent Metadata
    
    static let title: LocalizedStringResource = "Market Rate"
    static let description = IntentDescription("View the current Bitcoin market rate in your preferred currency.")
    static let openAppWhenRun = false

    // MARK: - Parameters
    
    @Parameter(
        title: "Currency",
        description: "Choose your preferred currency."
    )
    var fiatCurrency: FiatCurrency?

    func perform() async throws -> some IntentResult & ReturnsValue<Double> & ProvidesDialog & ShowsSnippetView {
        let selectedCurrency = resolveCurrency()
        
        do {
            let priceData = try await fetchPriceData(for: selectedCurrency)
            let successView = CompactPriceView(
                price: priceData.formattedPrice,
                lastUpdated: priceData.lastUpdate,
                code: priceData.currencyCode,
                dataSource: priceData.dataSource
            )
            
            return .result(
                value: priceData.rate,
                dialog: "Current Bitcoin Market Rate",
                view: successView
            )
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            let errorView = CompactPriceView(
                price: "N/A",
                lastUpdated: "--",
                code: selectedCurrency.id,
                dataSource: "Error fetching data"
            )
            
            return .result(
                value: 0.0,
                dialog: "Failed to retrieve the Bitcoin market rate.",
                view: errorView
            )
        }
    }

    // MARK: - Currency Resolution
    
    private func resolveCurrency() -> FiatCurrency {
        // Priority order: parameter -> shared defaults -> device locale -> USD fallback
        if let providedCurrency = fiatCurrency {
            return providedCurrency
        }
        
        if let sharedCurrency = getSharedCurrency() {
            return sharedCurrency
        }
        
        if let deviceCurrency = getDeviceCurrency() {
            return deviceCurrency
        }
        
        return FiatCurrencyQuery().defaultCurrency
    }
    
    private func getSharedCurrency() -> FiatCurrency? {
        guard let sharedDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue),
              let currencyCode = sharedDefaults.string(forKey: UserDefaultsGroupKey.PreferredCurrency.rawValue),
              let currency = FiatCurrencyQuery().currency(for: currencyCode) else {
            return nil
        }
        return currency
    }
    
    private func getDeviceCurrency() -> FiatCurrency? {
        guard let deviceCurrencyCode = Locale.current.currency?.identifier,
              let currency = FiatCurrencyQuery().currency(for: deviceCurrencyCode) else {
            return nil
        }
        return currency
    }

    // MARK: - Data Fetching
    
    private func fetchPriceData(for currency: FiatCurrency) async throws -> PriceData {
        guard let fetchedData = try await MarketAPI.fetchPrice(currency: currency.id) else {
            throw PriceIntentError.noPriceData
        }

        guard fetchedData.rateDouble.isFinite, fetchedData.rateDouble > 0 else {
            throw PriceIntentError.invalidRate
        }
        
        let formattedPrice = fetchedData.rateDouble.formattedPrice(in: currency)
        let formattedDate = fetchedData.lastUpdate.formattedDate
        
        return PriceData(
            rate: fetchedData.rateDouble,
            lastUpdate: formattedDate,
            formattedPrice: formattedPrice,
            currencyCode: currency.id,
            dataSource: currency.source
        )
    }

}

private extension String {
    var formattedDate: String {
        guard let date = ISO8601DateFormatter().date(from: self) else {
            return "--"
        }

        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

@available(iOS 16.0, *)
private extension Double {
    func formattedPrice(in currency: FiatCurrency) -> String {
        let style = FloatingPointFormatStyle<Double>.Currency(code: currency.id)
            .locale(.current)

        return formatted(style.precision(.fractionLength(self >= 1_000 ? 0 : 2)))
    }
}
