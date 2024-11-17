//
//  BalanceUnit.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/16/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

/// Represents the various balance units used in the application.
/// Conforms to `String`, `Codable`, `Equatable`, and `CustomStringConvertible` for easy encoding/decoding, comparisons, and descriptions.
enum BalanceUnit: String, Codable, Equatable, CustomStringConvertible {
    case btc = "BTC"
    case sats = "sats"
    case localCurrency = "local_currency"
    case max = "MAX"

    /// Provides a user-friendly description of the `BalanceUnit`.
    var description: String {
        switch self {
        case .btc:
            return "BTC"
        case .sats:
            return "sats"
        case .localCurrency:
            return "Local Currency"
        case .max:
            return "MAX"
        }
    }

    /// Initializes a `BalanceUnit` from a raw string.
    /// - Parameter rawString: The raw string representing the balance unit.
    init(rawString: String) {
        switch rawString.lowercased() {
        case "btc":
            self = .btc
        case "sats":
            self = .sats
        case "local_currency":
            self = .localCurrency
        case "max":
            self = .max
        default:
            // Handle unknown balance units if necessary
            // For now, defaulting to .max
            self = .max
        }
    }
}
