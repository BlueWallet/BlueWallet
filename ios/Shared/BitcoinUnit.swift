//
//  BitcoinUnit.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//
import Foundation

/// Represents the various balance units used in the application.
/// Conforms to `String`, `Codable`, `Equatable`, and `CustomStringConvertible` for easy encoding/decoding, comparisons, and descriptions.
enum BitcoinUnit: String, Codable, Equatable, CustomStringConvertible {
    case btc = "BTC"
    case sats = "sats"
    case localCurrency = "local_currency"
    case max = "MAX"

    /// Provides a user-friendly description of the `BitcoinUnit`.
    var description: String {
        switch self {
        case .btc:
            return String(localized: "BTC")
        case .sats:
            return String(localized: "sats")
        case .localCurrency:
            return String(localized: "Local Currency")
        case .max:
            return String(localized: "MAX")
        }
    }

    /// Initializes a `BitcoinUnit` from a raw string.
    /// - Parameter rawString: The raw string representing the balance unit.
    init(rawString: String) {
        switch rawString.lowercased() {
        case "btc":
            self = .sats
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

extension BitcoinUnit {
    static var mockUnit: BitcoinUnit {
        return .sats
    }
}
