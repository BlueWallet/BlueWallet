import Foundation

struct Transaction: Codable {
    let time: String
    let memo: String
    let amount: String
    let type: String
    
    init(time: String, memo: String, type: String, amount: String) {
        self.time = time
        self.memo = memo
        self.type = type
        self.amount = amount
    }
}
