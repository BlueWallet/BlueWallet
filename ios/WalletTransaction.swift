import Foundation
import SwiftData

@Model
class WalletTransaction: ObservableObject, Identifiable {
    @Attribute(.unique) var id: UUID
    var time: String
    var memo: String?
    var amount: String
    var type: String
    @Relationship(.cascade, inverse: \Wallet.transactions) var wallet: Wallet?

    init(id: UUID = UUID(), time: String, memo: String? = nil, amount: String, type: String, wallet: Wallet? = nil) {
        self.id = id
        self.time = time
        self.memo = memo
        self.amount = amount
        self.type = type
        self.wallet = wallet
    }
}
