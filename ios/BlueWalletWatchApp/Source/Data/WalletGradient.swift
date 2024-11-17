import SwiftUI

struct WalletGradient {
    
    // MARK: - Gradient Definitions
    
    static let hdSegwitP2SHWallet: [Color] = [
        Color(hex: "#007AFF"),
        Color(hex: "#0040FF")
    ]
    
    static let hdSegwitBech32Wallet: [Color] = [
        Color(hex: "#6CD9FC"),
        Color(hex: "#44BEE5")
    ]
    
    static let segwitBech32Wallet: [Color] = [
        Color(hex: "#6CD9FC"),
        Color(hex: "#44BEE5")
    ]
    
    static let watchOnlyWallet: [Color] = [
        Color(hex: "#474646"),
        Color(hex: "#282828")
    ]
    
    static let legacyWallet: [Color] = [
        Color(hex: "#37E8C0"),
        Color(hex: "#15BE98")
    ]
    
    static let hdLegacyP2PKHWallet: [Color] = [
        Color(hex: "#FD7478"),
        Color(hex: "#E73B40")
    ]
    
    static let hdLegacyBreadWallet: [Color] = [
        Color(hex: "#FE6381"),
        Color(hex: "#F99C42")
    ]
    
    static let multisigHdWallet: [Color] = [
        Color(hex: "#1CE6EB"),
        Color(hex: "#296FC5"),
        Color(hex: "#3500A2")
    ]
    
    static let defaultGradients: [Color] = [
        Color(hex: "#B770F6"),
        Color(hex: "#9013FE")
    ]
    
    static let lightningCustodianWallet: [Color] = [
        Color(hex: "#F1AA07"),
        Color(hex: "#FD7E37")
    ]
    
    static let aezeedWallet: [Color] = [
        Color(hex: "#8584FF"),
        Color(hex: "#5351FB")
    ]
    
    // MARK: - Gradient Selection
    
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
      default:
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
