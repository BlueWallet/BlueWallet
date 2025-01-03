import Foundation

/// Represents a transaction with various properties including its type.
/// Conforms to `Codable` and `Identifiable` for encoding/decoding and unique identification.
struct Transaction: Codable, Identifiable, Equatable {
    let id: UUID
    let time: Int  // Changed from Double to Int
    let memo: String
    let type: TransactionType
    let amount: Decimal
    
    /// Initializes a new Transaction instance.
    /// - Parameters:
    ///   - id: Unique identifier for the transaction. Defaults to a new UUID.
    ///   - time: Timestamp of the transaction.
    ///   - memo: A memo or note associated with the transaction.
    ///   - type: The type of the transaction, defined by `TransactionType`.
    ///   - amount: The amount involved in the transaction as a string.
    init(id: UUID = UUID(), time: Int, memo: String, type: TransactionType, amount: Decimal) {
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
            time: Int(Date().timeIntervalSince1970),  // Use seconds for time
            memo: "Mock Transaction",
            type: .sent,
            amount: 1
        )
    }
    
    static var mockTransactions: [Transaction] {
        [
            .mock,
            Transaction(
                time: Int(Date().timeIntervalSince1970),
                memo: "Another Mock Transaction",
                type: .received,
                amount: 222
            ),
            Transaction(
                time: Int(Date().timeIntervalSince1970),
                memo: "Hi",
                type: .pending,
                amount: 222
            )
        ]
    }
}
