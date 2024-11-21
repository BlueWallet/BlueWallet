// Models/WidgetDataStore.swift

import Foundation

struct WidgetDataStore: Codable {
    let rate: String
    let lastUpdate: String
    let rateDouble: Double
    
    // Computed Properties
    var formattedRate: String? {
        let numberFormatter = NumberFormatter()
        numberFormatter.locale = Locale(identifier: Currency.getUserPreferredCurrencyLocale())
        numberFormatter.numberStyle = .currency
        numberFormatter.maximumFractionDigits = 0
        numberFormatter.minimumFractionDigits = 0
        return numberFormatter.string(from: NSNumber(value: rateDouble)) ?? rate
    }
    
    var formattedRateForSmallComplication: String? {
        return rateDouble.abbreviated
    }
    
    var formattedRateForComplication: String? {
        let numberFormatter = NumberFormatter()
        numberFormatter.locale = Locale(identifier: Currency.getUserPreferredCurrencyLocale())
        numberFormatter.numberStyle = .currency
        numberFormatter.currencySymbol = ""
        return numberFormatter.string(from: NSNumber(value: rateDouble)) ?? rate
    }
    
    var date: Date? {
        let isoDateFormatter = ISO8601DateFormatter()
        return isoDateFormatter.date(from: lastUpdate)
    }
    
    var formattedDate: String? {
        guard let date = date else { return nil }
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale.current
        dateFormatter.timeStyle = .short
        return dateFormatter.string(from: date)
    }
    
    // **Renamed Custom Initializer**
    init(fromMarketData marketData: MarketData) {
      self.rate = marketData.rate.formattedPriceString()
              self.lastUpdate = marketData.formattedDate!
        self.rateDouble = marketData.rate
    }
}
