import Foundation
import SwiftData

@Model
class WalletTransaction {
    @Attribute(.unique) var id: UUID
    var time: String
    var memo: String
    var amount: String
    var type: String
    var wallet: Wallet

    required init(id: UUID, time: String, memo: String, amount: String, type: String, wallet: Wallet) {
        self.id = id
        self.time = time
        self.memo = memo
        self.amount = amount
        self.type = type
        self.wallet = wallet
    }
}
