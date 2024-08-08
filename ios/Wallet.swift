import Foundation
import SwiftData

@Model
class Wallet {
    @Attribute(.unique) var id: UUID
    var label: String
    var balance: Double
    var type: WalletType
    var receiveAddress: String
    var xpub: String?
    var hideBalance: Bool
    var paymentCode: String?
    var transactions: [WalletTransaction] = []
    var createdAt: Date // New property to store the creation time
    var preferredBalanceUnit: BitcoinUnit

  required init(id: UUID, label: String, balance: Double, type: WalletType, preferredBalanceUnit: BitcoinUnit = .BTC, receiveAddress: String, xpub: String?, hideBalance: Bool, paymentCode: String?, createdAt: Date) {
        self.id = id
        self.label = label
        self.balance = balance
        self.type = type
        self.preferredBalanceUnit = preferredBalanceUnit
        self.receiveAddress = receiveAddress
        self.xpub = xpub
        self.hideBalance = hideBalance
        self.paymentCode = paymentCode
        self.createdAt = createdAt
        self.preferredBalanceUnit = preferredBalanceUnit
    }

    func addTransactions(_ transactions: [WalletTransaction]) {
        self.transactions.append(contentsOf: transactions)
    }
  
  public func createInvoice(amount: Double, description: String?) throws -> String {
       // Mock implementation, replace with actual invoice creation logic
       return "invoice-\(UUID().uuidString)"
   }
}
