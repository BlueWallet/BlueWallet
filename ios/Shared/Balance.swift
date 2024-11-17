import Foundation

class Balance {
  static func formatBalance(_ balance: Decimal, toUnit: BalanceUnit, withFormatting: Bool = false, completion: @escaping (String) -> Void) {
    switch toUnit {
    case .btc:
      let value = balance / Decimal(100_000_000)
      completion("\(value) BTC") // Localize unit names as needed.
    case .sats:
      if withFormatting {
        completion(NumberFormatter.localizedString(from: balance as NSNumber, number: .decimal) + " SATS")
      } else {
        completion("\(balance) SATS")
      }
    case .localCurrency:
      fetchLocalCurrencyEquivalent(satoshi: balance, completion: completion)
    default:
      let value = balance / Decimal(100_000_000)
      completion("\(value) BTC") // Localize unit names as needed.
      
    }}

    private static func fetchLocalCurrencyEquivalent(satoshi: Decimal, completion: @escaping (String) -> Void) {
      
        let currency = Currency.getUserPreferredCurrency() // Ensure this method retrieves the correct currency code.
        MarketAPI.fetchPrice(currency: currency) { dataStore, error in
            DispatchQueue.main.async {
                guard let dataStore = dataStore, error == nil else {
                    completion("Error: \(error?.localizedDescription ?? "Unknown error")")
                    return
                }
                let rate = Decimal(string: dataStore.rate) ?? Decimal(0)
                let convertedAmount = (satoshi / Decimal(100_000_000)) * rate
                completion("\(convertedAmount) \(currency)")
            }
        }
    }
}
