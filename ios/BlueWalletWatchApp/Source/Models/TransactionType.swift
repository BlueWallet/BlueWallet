// Models/TransactionType.swift

import Foundation

/// Represents the various types of transactions available in the application.
/// Conforms to `Codable` and `Equatable`, handling encoding and decoding for known and unknown types.
enum TransactionType: Codable, Equatable {
    case sent
    case received
    case pending
    case lightningPayment
    case lightningInvoice
    case unknown(String) // For any unknown or future transaction types
    
    // MARK: - Coding Keys
    enum CodingKeys: String, CodingKey {
        case rawValue = "type"
    }
    
    // MARK: - Decodable Conformance
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let typeString = try container.decode(String.self, forKey: .rawValue)
        
        switch typeString.lowercased() {
        case "sent":
            self = .sent
        case "received":
            self = .received
        case "pending":
            self = .pending
        case "lightning_payment":
            self = .lightningPayment
        case "lightning_invoice":
            self = .lightningInvoice
        default:
            self = .unknown(typeString)
        }
    }
    
    // MARK: - Encodable Conformance
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        switch self {
        case .sent:
            try container.encode("sent", forKey: .rawValue)
        case .received:
            try container.encode("received", forKey: .rawValue)
        case .pending:
            try container.encode("pending", forKey: .rawValue)
        case .lightningPayment:
            try container.encode("lightning_payment", forKey: .rawValue)
        case .lightningInvoice:
            try container.encode("lightning_invoice", forKey: .rawValue)
        case .unknown(let typeString):
            try container.encode(typeString, forKey: .rawValue)
        }
    }
}
