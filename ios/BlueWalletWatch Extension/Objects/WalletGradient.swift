import SwiftUI

struct WalletGradient {
  
  static let hdSegwitP2SHWallet: [Color] = [
    Color( "#007AFF"),
    Color( "#0040FF")
  ]
  
  static let hdSegwitBech32Wallet: [Color] = [
    Color( "#6CD9FC"),
    Color( "#44BEE5")
  ]
  
  static let segwitBech32Wallet: [Color] = [
    Color( "#6CD9FC"),
    Color( "#44BEE5")
  ]
  
  static let watchOnlyWallet: [Color] = [
    Color( "#474646"),
    Color( "#282828")
  ]
  
  static let legacyWallet: [Color] = [
    Color( "#37E8C0"),
    Color( "#15BE98")
  ]
  
  static let hdLegacyP2PKHWallet: [Color] = [
    Color( "#FD7478"),
    Color( "#E73B40")
  ]
  
  static let hdLegacyBreadWallet: [Color] = [
    Color( "#FE6381"),
    Color( "#F99C42")
  ]
  
  static let multisigHdWallet: [Color] = [
    Color( "#1CE6EB"),
    Color( "#296FC5"),
    Color( "#3500A2")
  ]
  
  static let defaultGradients: [Color] = [
    Color( "#B770F6"),
    Color( "#9013FE")
  ]
  
  static let lightningCustodianWallet: [Color] = [
    Color( "#F1AA07"),
    Color( "#FD7E37")
  ]
  
  static let aezeedWallet: [Color] = [
    Color( "#8584FF"),
    Color( "#5351FB")
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
  
  static func imageStringFor(type: WalletType) -> String {
    
    switch type {
    case .hdSegwitP2SHWallet:
      return "wallet"
    case .segwitBech32Wallet:
      return "walletHDSegwitNative"
    case .hdSegwitBech32Wallet:
      return "walletHD"
    case .watchOnlyWallet:
      return "walletWatchOnly"
    case .lightningCustodianWallet:
      return "walletLightningCustodial"
    case .multisigHdWallet:
      return "watchMultisig"
    case .legacyWallet:
      return "walletLegacy"
    case .hdLegacyP2PKHWallet:
      return "walletHDLegacyP2PKH"
    case .hdLegacyBreadWallet:
      return "walletHDLegacyBread"
    case .aezeedWallet:
      return "walletAezeed"
    case .defaultGradients:
      return "walletLegacy"
    }
  }
}
