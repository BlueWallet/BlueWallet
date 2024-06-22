import Foundation
import SwiftData

@Model
class Wallet: ObservableObject, Identifiable {
    @Attribute(.unique) var id: UUID
    var label: String
    var balance: String
    var type: String
    var preferredBalanceUnit: String
    var receiveAddress: String
    var xpub: String?
    var hideBalance: Bool
    var paymentCode: String?
    @Relationship(.cascade, inverse: \WalletTransaction.wallet) var transactions: [WalletTransaction]

    init(id: UUID = UUID(), label: String, balance: String, type: String, preferredBalanceUnit: String, receiveAddress: String, xpub: String? = nil, hideBalance: Bool = false, paymentCode: String? = nil) {
        self.id = id
        self.label = label
        self.balance = balance
        self.type = type
        self.preferredBalanceUnit = preferredBalanceUnit
        self.receiveAddress = receiveAddress
        self.xpub = xpub
        self.hideBalance = hideBalance
        self.paymentCode = paymentCode
        self.transactions = []
    }
}
