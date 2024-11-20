import Foundation

/// Represents a transaction with various properties including its type.
/// Conforms to `Codable` and `Identifiable` for encoding/decoding and unique identification.
struct Transaction: Codable, Identifiable, Equatable {
    let id: UUID
    let time: String
    let memo: String
    let type: TransactionType
    let amount: String
    
    /// Initializes a new Transaction instance.
    /// - Parameters:
    ///   - id: Unique identifier for the transaction. Defaults to a new UUID.
    ///   - time: Timestamp of the transaction.
    ///   - memo: A memo or note associated with the transaction.
    ///   - type: The type of the transaction, defined by `TransactionType`.
    ///   - amount: The amount involved in the transaction as a string.
    init(id: UUID = UUID(), time: String, memo: String, type: TransactionType, amount: String) {
        self.id = id
        self.time = time
        self.memo = memo
        self.type = type
        self.amount = amount
    }
}

extension Transaction {
    static var mock: Transaction {
        Transaction(
            time: "2024-04-27T12:34:56Z",
            memo: "Mock Transaction",
            type: .sent,
            amount: "-0.001 BTC"
        )
    }
    
    static var mockTransactions: [Transaction] {
        [
            .mock,
            Transaction(
                time: "2024-04-26T11:22:33Z",
                memo: "Another Mock Transaction",
                type: .received,
                amount: "+0.002 BTC"
            ),
            Transaction(
                time: "2024-04-25T10:11:22Z",
                memo: "Third Mock Transaction",
                type: .pending,
                amount: "0.000 BTC"
            )
        ]
    }
    
  func formattedAmount(for unit: BitcoinUnit) -> String {
        guard let amountDecimal = Decimal(string: amount) else { return amount }
        return amountDecimal.formatted(as: unit)
    }
}
