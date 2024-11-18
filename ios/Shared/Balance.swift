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
