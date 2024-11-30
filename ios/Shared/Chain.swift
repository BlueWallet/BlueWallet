//
//  Chain.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/16/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

/// Represents the chain type for a wallet.
/// Conforms to `String`, `Codable`, `Equatable`, and `CustomStringConvertible` for easy encoding/decoding, comparisons, and descriptions.
enum Chain: String, Codable, Equatable, CustomStringConvertible {
    case onchain = "ONCHAIN"
    case offchain = "OFFCHAIN"

    /// Provides a user-friendly description of the `Chain`.
    var description: String {
        switch self {
        case .onchain:
            return "On-chain"
        case .offchain:
            return "Off-chain"
        }
    }

    /// Initializes a `Chain` from a raw string.
    /// - Parameter rawString: The raw string representing the chain type.
    init(rawString: String) {
        switch rawString.uppercased() {
        case "ONCHAIN":
            self = .onchain
        case "OFFCHAIN":
            self = .offchain
        default:
            // Handle unknown chain types if necessary
            // For now, defaulting to .onchain
            self = .onchain
        }
    }
}

extension Chain {
    static var mockChain: Chain {
        return .onchain
    }
}