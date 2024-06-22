import Foundation
import SwiftData

@Model
class MarketData {
    @Attribute(.unique) var id: UUID
    var nextBlock: String
    var sats: String
    var price: String
    var rate: Double
    var dateString: String
    var lastUpdate: String?

    required init(nextBlock: String, sats: String, price: String, rate: Double, dateString: String, lastUpdate: String?) {
        self.id = UUID()
        self.nextBlock = nextBlock
        self.sats = sats
        self.price = price
        self.rate = rate
        self.dateString = dateString
        self.lastUpdate = lastUpdate
    }

    var formattedNextBlock: String {
        if nextBlock == "..." {
            return "..."
        } else {
            if let nextBlockInt = Int(nextBlock) {
                let numberFormatter = NumberFormatter()
                numberFormatter.numberStyle = .decimal
                if let formattedNumber = numberFormatter.string(from: NSNumber(value: nextBlockInt)) {
                    return "\(formattedNumber) sat/vb"
                }
            }
            return "\(nextBlock) sat/vb"
        }
    }

    var formattedDate: String? {
        let isoDateFormatter = ISO8601DateFormatter()
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale.current
        dateFormatter.timeStyle = .short

        if let date = isoDateFormatter.date(from: dateString) {
            return dateFormatter.string(from: date)
        }
        return nil
    }
  
  var date: Date? {
    let isoDateFormatter = ISO8601DateFormatter()
    let dateFormatter = DateFormatter()
    dateFormatter.locale = Locale.current
    dateFormatter.timeStyle = .short
    
    return lastUpdate == nil ? nil : isoDateFormatter.date(from: lastUpdate!)
  }
  
  var formattedRateForSmallComplication: String? {
    return rate.abbreviated
  }
  
  var formattedRateForComplication: String? {
    let numberFormatter = NumberFormatter()
    numberFormatter.locale = Locale(identifier: Currency.getUserPreferredCurrencyLocale())
    numberFormatter.numberStyle = .currency
    numberFormatter.currencySymbol = ""
    if let rateString = numberFormatter.string(from: NSNumber(value: rate)) {
      return rateString
    }
    return nil
  }
}

enum MarketDataTimeline: String {
    case previous = "previous"
    case current = "current"
}
