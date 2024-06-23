import Foundation
import SwiftData

@Model
class WalletTransaction {
    @Attribute(.unique) var id: UUID
    var time: String
    var memo: String
    var amount: String
    var type: WalletTransactionType
    var wallet: Wallet

    required init(id: UUID, time: String, memo: String, amount: String, type: WalletTransactionType, wallet: Wallet) {
        self.id = id
        self.time = time
        self.memo = memo
        self.amount = amount
        self.type = type
        self.wallet = wallet
    }
}


enum WalletTransactionType: String, Codable, CaseIterable  {
  case Received, Sent, Pending
}
