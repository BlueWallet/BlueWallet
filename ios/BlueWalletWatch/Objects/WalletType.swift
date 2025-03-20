//
//  WalletType.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/20/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


import Foundation

/// Represents the various types of wallets available in the application.
/// Conforms to `Codable` and `Equatable`, handling encoding and decoding for known and unknown types.
enum WalletType: Codable, Equatable {
    case hdSegwitP2SHWallet
    case hdSegwitBech32Wallet
    case segwitBech32Wallet
    case watchOnlyWallet
    case legacyWallet
    case hdLegacyP2PKHWallet
    case hdLegacyBreadWallet
    case multisigHdWallet
    case lightningCustodianWallet
    case aezeedWallet
    case defaultGradients

    // MARK: - Coding Keys
    enum CodingKeys: String, CodingKey {
        case rawValue = "type"
    }

    // MARK: - Decodable Conformance
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let typeString = try container.decode(String.self, forKey: .rawValue)

        switch typeString {
        case "HDsegwitP2SH":
            self = .hdSegwitP2SHWallet
        case "HDsegwitBech32":
            self = .hdSegwitBech32Wallet
        case "segwitBech32":
            self = .segwitBech32Wallet
        case "watchOnly":
            self = .watchOnlyWallet
        case "legacy":
            self = .legacyWallet
        case "HDLegacyP2PKH":
            self = .hdLegacyP2PKHWallet
        case "HDLegacyBreadwallet":
            self = .hdLegacyBreadWallet
        case "HDmultisig":
            self = .multisigHdWallet
        case "LightningCustodianWallet":
            self = .lightningCustodianWallet
        case "HDAezeedWallet":
            self = .aezeedWallet
        default:
            self = .defaultGradients
        }
    }

    // MARK: - Encodable Conformance
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .hdSegwitP2SHWallet:
            try container.encode("HDsegwitP2SH", forKey: .rawValue)
        case .hdSegwitBech32Wallet:
            try container.encode("HDsegwitBech32", forKey: .rawValue)
        case .segwitBech32Wallet:
            try container.encode("segwitBech32", forKey: .rawValue)
        case .watchOnlyWallet:
            try container.encode("watchOnly", forKey: .rawValue)
        case .legacyWallet:
            try container.encode("legacy", forKey: .rawValue)
        case .hdLegacyP2PKHWallet:
            try container.encode("HDLegacyP2PKH", forKey: .rawValue)
        case .hdLegacyBreadWallet:
            try container.encode("HDLegacyBreadwallet", forKey: .rawValue)
        case .multisigHdWallet:
            try container.encode("HDmultisig", forKey: .rawValue)
        case .lightningCustodianWallet:
            try container.encode("LightningCustodianWallet", forKey: .rawValue)
        case .aezeedWallet:
            try container.encode("HDAezeedWallet", forKey: .rawValue)
        case .defaultGradients:
            try container.encode("DefaultGradients", forKey: .rawValue)
        }
    }

    // MARK: - Custom Initializer from Raw String
    /// Initializes a `WalletType` from a raw string.
    /// - Parameter rawString: The raw string representing the wallet type.
    init(rawString: String) {
        self = WalletType.fromRawString(rawString)
    }

    static func fromRawString(_ typeString: String) -> WalletType {
        switch typeString {
        case "HDsegwitP2SH":
            return .hdSegwitP2SHWallet
        case "HDsegwitBech32":
            return .hdSegwitBech32Wallet
        case "segwitBech32":
            return .segwitBech32Wallet
        case "watchOnly":
            return .watchOnlyWallet
        case "legacy":
            return .legacyWallet
        case "HDLegacyP2PKH":
            return .hdLegacyP2PKHWallet
        case "HDLegacyBreadwallet":
            return .hdLegacyBreadWallet
        case "HDmultisig":
            return .multisigHdWallet
        case "LightningCustodianWallet":
            return .lightningCustodianWallet
        case "HDAezeedWallet":
            return .aezeedWallet
        case "DefaultGradients":
            return .defaultGradients
        default:
            return .defaultGradients
        }
    }

    // MARK: - Computed Property for Raw String
    /// Returns the raw string associated with the `WalletType`.
    var rawString: String {
        switch self {
        case .hdSegwitP2SHWallet:
            return "HDsegwitP2SH"
        case .hdSegwitBech32Wallet:
            return "HDsegwitBech32"
        case .segwitBech32Wallet:
            return "segwitBech32"
        case .watchOnlyWallet:
            return "watchOnly"
        case .legacyWallet:
            return "legacy"
        case .hdLegacyP2PKHWallet:
            return "HDLegacyP2PKH"
        case .hdLegacyBreadWallet:
            return "HDLegacyBreadwallet"
        case .multisigHdWallet:
            return "HDmultisig"
        case .lightningCustodianWallet:
            return "LightningCustodianWallet"
        case .aezeedWallet:
            return "HDAezeedWallet"
        case .defaultGradients:
            return "DefaultGradients"
        }
    }
}

// MARK: - CustomStringConvertible Conformance
extension WalletType: CustomStringConvertible {
    /// Provides a user-friendly description of the `WalletType`.
    var description: String {
        switch self {
        case .hdSegwitP2SHWallet:
            return "HD Segwit P2SH Wallet"
        case .hdSegwitBech32Wallet:
            return "HD Segwit Bech32 Wallet"
        case .segwitBech32Wallet:
            return "Segwit Bech32 Wallet"
        case .watchOnlyWallet:
            return "Watch Only Wallet"
        case .legacyWallet:
            return "Legacy Wallet"
        case .hdLegacyP2PKHWallet:
            return "HD Legacy P2PKH Wallet"
        case .hdLegacyBreadWallet:
            return "HD Legacy Bread Wallet"
        case .multisigHdWallet:
            return "Multisig HD Wallet"
        case .lightningCustodianWallet:
            return "Lightning Custodian Wallet"
        case .aezeedWallet:
            return "Aezeed Wallet"
        case .defaultGradients:
            return "Default Gradients"
        }
    }
}

extension WalletType {
    static var mockType: WalletType {
        return .hdSegwitBech32Wallet
    }
}