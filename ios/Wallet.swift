import Foundation
import SwiftData

@Model
class Wallet {
    @Attribute(.unique) var id: UUID
    var label: String
    var balance: String
    var type: WalletType
    var preferredBalanceUnit: String
    var receiveAddress: String
    var xpub: String?
    var hideBalance: Bool
    var paymentCode: String?
    var transactions: [WalletTransaction] = []

    required init(id: UUID, label: String, balance: String, type: WalletType, preferredBalanceUnit: String, receiveAddress: String, xpub: String?, hideBalance: Bool, paymentCode: String?) {
        self.id = id
        self.label = label
        self.balance = balance
        self.type = type
        self.preferredBalanceUnit = preferredBalanceUnit
        self.receiveAddress = receiveAddress
        self.xpub = xpub
        self.hideBalance = hideBalance
        self.paymentCode = paymentCode
    }

    func addTransactions(_ transactions: [WalletTransaction]) {
        self.transactions.append(contentsOf: transactions)
    }
  
  public func createInvoice(amount: Double, description: String?) throws -> String {
       // Mock implementation, replace with actual invoice creation logic
       return "invoice-\(UUID().uuidString)"
   }
}
