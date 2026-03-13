import Foundation

class Balance {
    static func formatBalance(_ balance: Decimal, toUnit: BitcoinUnit, withFormatting: Bool = false) async -> String {
      switch toUnit {
      case .sats:
        if withFormatting {
          return NumberFormatter.localizedString(from: balance as NSNumber, number: .decimal) + " " + String(localized: "SATS")
        } else {
          return "\(balance) \(String(localized: "SATS"))"
        }
      case .localCurrency:
        return await fetchLocalCurrencyEquivalent(satoshi: balance)

      default:
        let value = balance / Decimal(100_000_000)
        return "\(value) \(String(localized: "BTC"))"
      }
    }

    private static func fetchLocalCurrencyEquivalent(satoshi: Decimal) async -> String {
        let currency = Currency.getUserPreferredCurrency()
        do {
            guard let dataStore = try await MarketAPI.fetchPrice(currency: currency) else {
                return String(localized: "N/A")
            }
            let rate = Decimal(string: dataStore.rate) ?? Decimal(0)
            let convertedAmount = (satoshi / Decimal(100_000_000)) * rate
            return "\(convertedAmount) \(currency)"
        } catch {
            return "\(String(localized: "Error")): \(error.localizedDescription)"
        }
    }
}

extension Decimal {
  func formatted(as unit: BitcoinUnit, withFormatting: Bool = false) -> String {
        switch unit {
        case .sats:
            return withFormatting ? NumberFormatter.localizedString(from: self as NSNumber, number: .decimal) + " " + String(localized: "SATS") : "\(self) \(String(localized: "SATS"))"
        case .localCurrency:
            let userDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
            if let widgetData = userDefaults?.object(forKey: MarketData.string) as? Data,
               let marketData = try? JSONDecoder().decode(MarketData.self, from: widgetData) {
                let rate = Decimal(marketData.rate)
                let convertedAmount = (self / Decimal(100_000_000)) * rate
                return "\(convertedAmount) \(Currency.getUserPreferredCurrency())"
            } else {
                return String(localized: "N/A")
            }
        default:
            let value = self / Decimal(100_000_000)
            return "\(value) \(String(localized: "BTC"))"
        }
    }
}
