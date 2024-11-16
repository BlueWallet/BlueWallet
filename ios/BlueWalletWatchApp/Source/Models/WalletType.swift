// Models/WalletType.swift

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
    case unknown(String) // For any unknown or future wallet types

    // MARK: - Coding Keys
    enum CodingKeys: String, CodingKey {
        case rawValue = "type"
    }

    // MARK: - Decodable Conformance
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let typeString = try container.decode(String.self, forKey: .rawValue)
        
        switch typeString {
        case "HDSegwitP2SHWallet":
            self = .hdSegwitP2SHWallet
        case "HDSegwitBech32Wallet":
            self = .hdSegwitBech32Wallet
        case "SegwitBech32Wallet":
            self = .segwitBech32Wallet
        case "WatchOnlyWallet":
            self = .watchOnlyWallet
        case "LegacyWallet":
            self = .legacyWallet
        case "HDLegacyP2PKHWallet":
            self = .hdLegacyP2PKHWallet
        case "HDLegacyBreadwalletWallet":
            self = .hdLegacyBreadWallet
        case "MultisigHDWallet":
            self = .multisigHdWallet
        case "LightningCustodianWallet":
            self = .lightningCustodianWallet
        case "HDAezeedWallet":
            self = .aezeedWallet
        case "DefaultGradients":
            self = .defaultGradients
        default:
            self = .unknown(typeString)
        }
    }

    // MARK: - Encodable Conformance
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        switch self {
        case .hdSegwitP2SHWallet:
            try container.encode("HDSegwitP2SHWallet", forKey: .rawValue)
        case .hdSegwitBech32Wallet:
            try container.encode("HDSegwitBech32Wallet", forKey: .rawValue)
        case .segwitBech32Wallet:
            try container.encode("SegwitBech32Wallet", forKey: .rawValue)
        case .watchOnlyWallet:
            try container.encode("WatchOnlyWallet", forKey: .rawValue)
        case .legacyWallet:
            try container.encode("LegacyWallet", forKey: .rawValue)
        case .hdLegacyP2PKHWallet:
            try container.encode("HDLegacyP2PKHWallet", forKey: .rawValue)
        case .hdLegacyBreadWallet:
            try container.encode("HDLegacyBreadwalletWallet", forKey: .rawValue)
        case .multisigHdWallet:
            try container.encode("MultisigHDWallet", forKey: .rawValue)
        case .lightningCustodianWallet:
            try container.encode("LightningCustodianWallet", forKey: .rawValue)
        case .aezeedWallet:
            try container.encode("HDAezeedWallet", forKey: .rawValue)
        case .defaultGradients:
            try container.encode("DefaultGradients", forKey: .rawValue)
        case .unknown(let typeString):
            try container.encode(typeString, forKey: .rawValue)
        }
    }

    // MARK: - Computed Property for Raw String
    /// Returns the raw string associated with the WalletType.
    var rawString: String {
        switch self {
        case .hdSegwitP2SHWallet:
            return "HDSegwitP2SHWallet"
        case .hdSegwitBech32Wallet:
            return "HDSegwitBech32Wallet"
        case .segwitBech32Wallet:
            return "SegwitBech32Wallet"
        case .watchOnlyWallet:
            return "WatchOnlyWallet"
        case .legacyWallet:
            return "LegacyWallet"
        case .hdLegacyP2PKHWallet:
            return "HDLegacyP2PKHWallet"
        case .hdLegacyBreadWallet:
            return "HDLegacyBreadwalletWallet"
        case .multisigHdWallet:
            return "MultisigHDWallet"
        case .lightningCustodianWallet:
            return "LightningCustodianWallet"
        case .aezeedWallet:
            return "HDAezeedWallet"
        case .defaultGradients:
            return "DefaultGradients"
        case .unknown(let typeString):
            return typeString
        }
    }

    // MARK: - Helper Function to Convert Raw String to WalletType
    /// Attempts to convert a raw string to its corresponding WalletType.
    /// - Parameter typeString: The raw string representing the wallet type.
    /// - Returns: A `WalletType` instance.
    static func fromRawString(_ typeString: String) -> WalletType {
        switch typeString {
        case "HDSegwitP2SHWallet":
            return .hdSegwitP2SHWallet
        case "HDSegwitBech32Wallet":
            return .hdSegwitBech32Wallet
        case "SegwitBech32Wallet":
            return .segwitBech32Wallet
        case "WatchOnlyWallet":
            return .watchOnlyWallet
        case "LegacyWallet":
            return .legacyWallet
        case "HDLegacyP2PKHWallet":
            return .hdLegacyP2PKHWallet
        case "HDLegacyBreadwalletWallet":
            return .hdLegacyBreadWallet
        case "MultisigHDWallet":
            return .multisigHdWallet
        case "LightningCustodianWallet":
            return .lightningCustodianWallet
        case "HDAezeedWallet":
            return .aezeedWallet
        case "DefaultGradients":
            return .defaultGradients
        default:
            return .unknown(typeString)
        }
    }
}
