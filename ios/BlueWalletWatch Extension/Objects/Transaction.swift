import Foundation

/// Represents a transaction with various properties including its type.
/// Conforms to `Codable` and `Identifiable` for encoding/decoding and unique identification.
struct Transaction: Codable, Identifiable, Equatable {
    let id: UUID
    let time: Date
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
    init(id: UUID = UUID(), time: Date, memo: String, type: TransactionType, amount: Decimal) {
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
            time: Date(timeIntervalSince1970: 1714398896), // 2024-04-27T12:34:56Z
            memo: "Mock Transaction",
            type: .sent,
            amount: Decimal(string: "-0.001")!
        )
    }
    
    static var mockTransactions: [Transaction] {
        [
            .mock,
            Transaction(
                time: Date(timeIntervalSince1970: 1714308153), // 2024-04-26T11:22:33Z
                memo: "Another Mock Transaction",
                type: .received,
                amount: Decimal(string: "0.002")!
            ),
            Transaction(
                time: Date(timeIntervalSince1970: 1714217482), // 2024-04-25T10:11:22Z
                memo: "Third Mock Transaction",
                type: .pending,
                amount: Decimal.zero
            )
        ]
    }
    
func formattedAmount(for unit: BitcoinUnit) -> String {
        return amount.formatted(as: unit)
    }
}
