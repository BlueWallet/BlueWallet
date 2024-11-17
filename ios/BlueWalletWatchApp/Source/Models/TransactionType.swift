// Models/TransactionType.swift

import Foundation

/// Represents the various types of transactions available in the application.
/// Conforms to `String`, `Codable`, `Equatable`, and `CustomStringConvertible` for easy encoding/decoding, comparisons, and descriptions.
enum TransactionType: Codable, Equatable, CustomStringConvertible {
    case sent
    case received
    case pending
    case unknown(String) // For any unknown or future transaction types

    // MARK: - Coding Keys
    enum CodingKeys: String, CodingKey {
        case rawValue = "type"
    }

    // MARK: - Decodable Conformance
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let typeString = try container.decode(String.self, forKey: .rawValue)
        self = TransactionType(rawString: typeString)
    }

    // MARK: - Encodable Conformance
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(self.rawString, forKey: .rawValue)
    }

    // MARK: - Custom Initializer
    /// Initializes a `TransactionType` from a raw string.
    /// - Parameter rawString: The raw string representing the transaction type.
    init(rawString: String) {
        switch rawString.lowercased() {
        case "sent":
            self = .sent
        case "received":
            self = .received
        case "pending":
            self = .pending
        default:
            self = .unknown(rawString)
        }
    }

    // MARK: - Computed Property for Raw String
    /// Returns the raw string associated with the `TransactionType`.
    var rawString: String {
        switch self {
        case .sent:
            return "sent"
        case .received:
            return "received"
        case .pending:
            return "pending"
        case .unknown(let typeString):
            return typeString
        }
    }

    // MARK: - Description
    /// Provides a user-friendly description of the `TransactionType`.
    var description: String {
        switch self {
        case .sent:
            return "Sent"
        case .received:
            return "Received"
        case .pending:
            return "pending"
        case .unknown(let typeString):
            return typeString
        }
    }

    // MARK: - Helper Function to Convert Raw String to TransactionType
    /// Attempts to convert a raw string to its corresponding `TransactionType`.
    /// - Parameter typeString: The raw string representing the transaction type.
    /// - Returns: A `TransactionType` instance.
    static func fromRawString(_ typeString: String) -> TransactionType {
        return TransactionType(rawString: typeString)
    }
}
