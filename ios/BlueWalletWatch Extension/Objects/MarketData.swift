import Foundation
import SwiftData

@Model
class MarketData: ObservableObject, Identifiable {
    @Attribute(.unique) var id: UUID
    var nextBlock: String
    var sats: String
    var price: String
    var rate: Double
    var dateString: String

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
            return "\(nextBlock) sat/vb"  // Fallback in case the nextBlock cannot be converted to an Int
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

    init(id: UUID = UUID(), nextBlock: String, sats: String, price: String, rate: Double, dateString: String) {
        self.id = id
        self.nextBlock = nextBlock
        self.sats = sats
        self.price = price
        self.rate = rate
        self.dateString = dateString
    }
}
