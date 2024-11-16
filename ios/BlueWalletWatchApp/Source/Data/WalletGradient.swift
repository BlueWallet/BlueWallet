// Utilities/WalletGradient.swift

import SwiftUI

/// A utility struct for managing wallet gradients based on wallet types.
/// It provides predefined gradients and methods to select appropriate gradients for different wallet categories.
struct WalletGradient {
    
    // MARK: - Gradient Definitions
    
    /// Gradient for HD Segwit P2SH Wallet
    static let hdSegwitP2SHWallet: [Color] = [
        Color(hex: "#007AFF"),
        Color(hex: "#0040FF")
    ]
    
    /// Gradient for HD Segwit Bech32 Wallet
    static let hdSegwitBech32Wallet: [Color] = [
        Color(hex: "#6CD9FC"),
        Color(hex: "#44BEE5")
    ]
    
    /// Gradient for Segwit Bech32 Wallet
    static let segwitBech32Wallet: [Color] = [
        Color(hex: "#6CD9FC"),
        Color(hex: "#44BEE5")
    ]
    
    /// Gradient for Watch Only Wallet
    static let watchOnlyWallet: [Color] = [
        Color(hex: "#474646"),
        Color(hex: "#282828")
    ]
    
    /// Gradient for Legacy Wallet
    static let legacyWallet: [Color] = [
        Color(hex: "#37E8C0"),
        Color(hex: "#15BE98")
    ]
    
    /// Gradient for HD Legacy P2PKH Wallet
    static let hdLegacyP2PKHWallet: [Color] = [
        Color(hex: "#FD7478"),
        Color(hex: "#E73B40")
    ]
    
    /// Gradient for HD Legacy Bread Wallet
    static let hdLegacyBreadWallet: [Color] = [
        Color(hex: "#FE6381"),
        Color(hex: "#F99C42")
    ]
    
    /// Gradient for Multisig HD Wallet
    static let multisigHdWallet: [Color] = [
        Color(hex: "#1CE6EB"),
        Color(hex: "#296FC5"),
        Color(hex: "#3500A2")
    ]
    
    /// Default Gradient used as a fallback
    static let defaultGradients: [Color] = [
        Color(hex: "#B770F6"),
        Color(hex: "#9013FE")
    ]
    
    /// Gradient for Lightning Custodian Wallet
    static let lightningCustodianWallet: [Color] = [
        Color(hex: "#F1AA07"),
        Color(hex: "#FD7E37")
    ]
    
    /// Gradient for Aezeed Wallet
    static let aezeedWallet: [Color] = [
        Color(hex: "#8584FF"),
        Color(hex: "#5351FB")
    ]
    
    // MARK: - Gradient Selection
    
    /// Returns the appropriate gradient based on the provided `WalletType`.
    /// - Parameter type: The type of the wallet.
    /// - Returns: An array of `Color` representing the gradient for the wallet.
    static func gradientsFor(type: WalletType) -> [Color] {
        switch type {
        case .watchOnlyWallet:
            return WalletGradient.watchOnlyWallet
        case .legacyWallet:
            return WalletGradient.legacyWallet
        case .hdLegacyP2PKHWallet:
            return WalletGradient.hdLegacyP2PKHWallet
        case .hdLegacyBreadWallet:
            return WalletGradient.hdLegacyBreadWallet
        case .hdSegwitP2SHWallet:
            return WalletGradient.hdSegwitP2SHWallet
        case .hdSegwitBech32Wallet:
            return WalletGradient.hdSegwitBech32Wallet
        case .segwitBech32Wallet:
            return WalletGradient.segwitBech32Wallet
        case .multisigHdWallet:
            return WalletGradient.multisigHdWallet
        case .aezeedWallet:
            return WalletGradient.aezeedWallet
        case .lightningCustodianWallet:
            return WalletGradient.lightningCustodianWallet
        case .defaultGradients:
            fallthrough
        case .unknown(_):
            return WalletGradient.defaultGradients
        }
    }
    
    // MARK: - Header Color Selection
    
    /// Returns the primary color for headers based on the wallet type.
    /// Typically, the first color of the gradient is used for headers.
    /// - Parameter type: The type of the wallet.
    /// - Returns: A `Color` representing the header color.
    static func headerColorFor(type: WalletType) -> Color {
        let gradient = gradientsFor(type: type)
        return gradient.first ?? Color.black // Defaults to black if gradient is empty
    }
}

/// Extension to `Color` to allow initialization using hexadecimal color codes.
/// Supports RGB (3 characters), RRGGBB (6 characters), and AARRGGBB (8 characters) formats.
extension Color {
    /// Initializes a `Color` instance from a hexadecimal color code string.
    /// - Parameter hex: The hexadecimal color code string (e.g., "#FF5733", "FF5733", "FFF").
    init(hex: String) {
        // Remove any non-alphanumeric characters (like "#")
        let cleanedHex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        
        var int: UInt64 = 0
        Scanner(string: cleanedHex).scanHexInt64(&int)
        
        let a, r, g, b: UInt64
        switch cleanedHex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (
                255,
                (int >> 8) * 17,
                (int >> 4 & 0xF) * 17,
                (int & 0xF) * 17
            )
        case 6: // RGB (24-bit)
            (a, r, g, b) = (
                255,
                int >> 16,
                int >> 8 & 0xFF,
                int & 0xFF
            )
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (
                int >> 24,
                int >> 16 & 0xFF,
                int >> 8 & 0xFF,
                int & 0xFF
            )
        default:
            // Default to black color if the hex string is invalid
            (a, r, g, b) = (255, 0, 0, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
