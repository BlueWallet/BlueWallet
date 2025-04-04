//
//  TransactionType.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/20/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


// Models/TransactionType.swift

import Foundation

/// Represents the various types of transactions available in the application.
/// Conforms to `String`, `Codable`, `Equatable`, and `CustomStringConvertible` for easy encoding/decoding, comparisons, and descriptions.
enum TransactionType: Codable, Equatable {
    // Transaction state
    case pending
    case expired
    
    // Transaction type
    case onchain
    case offchain
    
    // Fallback
    case unknown(String) // For any unknown or future transaction types
    
    case sent
    case received

    // MARK: - Coding Keys
    enum CodingKeys: String, CodingKey {
        case rawValue = "type"
    }

    // MARK: - Decodable Conformance
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let typeString = try container.decode(String.self, forKey: .rawValue)
        self = TransactionType.fromRawString(typeString)
    }

    // MARK: - Encodable Conformance
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(self.rawString, forKey: .rawValue)
    }

    static func fromRawString(_ typeString: String) -> TransactionType {
        switch typeString.lowercased() {
        case "sent":
            return .sent
        case "received":
            return .received
        case "pending":
            return .pending
        case "bitcoind_tx":
            return .onchain
        case "paid_invoice":
            return .offchain
        default:
            return .unknown(typeString)
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
        case .onchain:
            return "bitcoind_tx"
        case .offchain:
            return "paid_invoice"
        case .unknown(let typeString):
            return typeString
        case .expired:
          return "expired"
        }
    }
}

// MARK: - CustomStringConvertible Conformance
extension TransactionType: CustomStringConvertible {
    /// Provides a user-friendly description of the `TransactionType`.
    var description: String {
        switch self {
        case .sent:
            return "Sent"
        case .received:
            return "Received"
        case .pending:
            return "pending"
        case .onchain:
            return "Onchain"
        case .offchain:
            return "Offchain"
        case .unknown(let typeString):
            return typeString
        case .expired:
            return "Expired"
        }
    }
}

// MARK: - Computed Properties for Categorizing Transaction Types
extension TransactionType {
    var isIncoming: Bool {
        switch self {
        case .received:
            return true
        default:
            return false
        }
    }

    var isOutgoing: Bool {
        switch self {
        case .sent:
            return true
        default:
            return false
        }
    }

    var isPending: Bool {
        switch self {
        case .pending:
            return true
        default:
            return false
        }
    }
    
    static var mockSent: TransactionType {
      return .sent
    }
    
    static var mockReceived: TransactionType {
      return .received
    }
}
