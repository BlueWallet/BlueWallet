//
//  PriceIntent.swift
//  BlueWallet
//

import AppIntents
import SwiftUI
import Foundation

// MARK: - Error Types

enum PriceIntentError: LocalizedError {
    case fetchFailed
    case invalidData
    case networkUnavailable
    
    var errorDescription: String? {
        switch self {
        case .fetchFailed:
            return "Failed to fetch Bitcoin price data"
        case .invalidData:
            return "Received invalid price data"
        case .networkUnavailable:
            return "Network is unavailable"
        }
    }
}

// MARK: - Price Data Model

struct PriceData {
    let rate: Double
    let lastUpdate: String
    let formattedPrice: String
    let currencyCode: String
    let dataSource: String
}

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
        } catch {
            let errorView = CompactPriceView(
                price: "N/A",
                lastUpdated: "--",
                code: selectedCurrency.rawValue,
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
    
    private func resolveCurrency() -> FiatUnitEnum {
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
        
        return .USD
    }
    
    private func getSharedCurrency() -> FiatUnitEnum? {
        guard let sharedDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue),
              let currencyCode = sharedDefaults.string(forKey: UserDefaultsGroupKey.PreferredCurrency.rawValue),
              let currency = FiatUnitEnum(rawValue: currencyCode.uppercased()) else {
            return nil
        }
        return currency
    }
    
    private func getDeviceCurrency() -> FiatUnitEnum? {
        guard let deviceCurrencyCode = Locale.current.currency?.identifier,
              let currency = FiatUnitEnum(rawValue: deviceCurrencyCode.uppercased()) else {
            return nil
        }
        return currency
    }

    // MARK: - Data Fetching
    
    private func fetchPriceData(for currency: FiatUnitEnum) async throws -> PriceData {
        guard let fetchedData = try await MarketAPI.fetchPrice(currency: currency.rawValue) else {
            throw PriceIntentError.fetchFailed
        }
        
        let formattedPrice = formatPrice(fetchedData.rateDouble, currencyCode: currency.rawValue)
        let formattedDate = formatDate(from: fetchedData.lastUpdate)
        
        return PriceData(
            rate: fetchedData.rateDouble,
            lastUpdate: formattedDate,
            formattedPrice: formattedPrice,
            currencyCode: currency.rawValue,
            dataSource: currency.source
        )    }

    // MARK: - Formatting Methods

    private func formatDate(from isoString: String?) -> String {
        guard let isoString = isoString,
              let date = ISO8601DateFormatter().date(from: isoString) else {
            return "--"
        }

        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    private func formatPrice(_ price: Double, currencyCode: String) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale.current
        formatter.currencyCode = currencyCode

        if price >= 1000 {
            formatter.maximumFractionDigits = 0
            formatter.minimumFractionDigits = 0
        } else {
            formatter.maximumFractionDigits = 2
            formatter.minimumFractionDigits = 2
        }

        return formatter.string(from: NSNumber(value: price)) ?? "\(price)"
    }
}
