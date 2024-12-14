import Foundation

class Balance {
    static func formatBalance(_ balance: Decimal, toUnit: BalanceUnit, withFormatting: Bool = false) -> String {
        switch toUnit {
        case .btc:
            let value = balance / Decimal(100_000_000)
            return "\(removeTrailingZeros(value)) BTC" // Localize unit names as needed.
        case .sats:
            if withFormatting {
                return NumberFormatter.localizedString(from: balance as NSNumber, number: .decimal) + " SATS"
            } else {
                return "\(balance) SATS"
            }
        case .localCurrency:
            return fetchLocalCurrencyEquivalent(satoshi: balance)
        default:
            let value = balance / Decimal(100_000_000)
            return "\(removeTrailingZeros(value)) BTC" // Localize unit names as needed.
        }
    }

    private static func fetchLocalCurrencyEquivalent(satoshi: Decimal) -> String {
        let currency = Currency.getUserPreferredCurrency() // Ensure this method retrieves the correct currency code.
        var result = "0 \(currency)"
        MarketAPI.fetchPrice(currency: currency) { dataStore, error in
            DispatchQueue.main.async {
                guard let dataStore = dataStore, error == nil else {
                    result = "Error: \(error?.localizedDescription ?? "Unknown error")"
                    return
                }
                let rate = Decimal(string: dataStore.rate) ?? Decimal(0)
                let convertedAmount = (satoshi / Decimal(100_000_000)) * rate
                result = "\(convertedAmount) \(currency)"
            }
        }
        return result
    }

    private static func removeTrailingZeros(_ value: Decimal) -> String {
        var stringValue = "\(value)"
        while stringValue.last == "0" || stringValue.last == "." {
            stringValue.removeLast()
        }
        return stringValue
    }
}

extension Decimal {
  func formatted(as unit: BalanceUnit, withFormatting: Bool = false) -> String {
        switch unit {
        case .sats:
            return withFormatting ? NumberFormatter.localizedString(from: self as NSNumber, number: .decimal) + " SATS" : "\(self) SATS"
        case .localCurrency:
            let userDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
            if let widgetData = userDefaults?.object(forKey: MarketData.string) as? Data,
               let marketData = try? JSONDecoder().decode(MarketData.self, from: widgetData) {
                let rate = Decimal(marketData.rate)
                let convertedAmount = (self / Decimal(100_000_000)) * rate
                return "\(convertedAmount) \(Currency.getUserPreferredCurrency())"
            } else {
                return "N/A"
            }
        default:
            let value = self / Decimal(100_000_000)
            return "\(value) BTC"
        }
    }
}
