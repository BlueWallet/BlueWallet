import WatchKit

// Extension to support hex color initialization for watchOS
extension UIColor {
    convenience init(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)
        
        let red = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let green = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let blue = CGFloat(rgb & 0x0000FF) / 255.0
        
        self.init(red: red, green: green, blue: blue, alpha: 1.0)
    }
}

struct WalletGradient {
  
  static let hdSegwitP2SHWallet: [UIColor] = [
    UIColor(hex: "#007AFF"),
    UIColor(hex: "#0040FF")
  ]
  
  static let hdSegwitBech32Wallet: [UIColor] = [
    UIColor(hex: "#6CD9FC"),
    UIColor(hex: "#44BEE5")
  ]
  
  static let segwitBech32Wallet: [UIColor] = [
    UIColor(hex: "#6CD9FC"),
    UIColor(hex: "#44BEE5")
  ]
  
  static let watchOnlyWallet: [UIColor] = [
    UIColor(hex: "#474646"),
    UIColor(hex: "#282828")
  ]
  
  static let legacyWallet: [UIColor] = [
    UIColor(hex: "#37E8C0"),
    UIColor(hex: "#15BE98")
  ]
  
  static let hdLegacyP2PKHWallet: [UIColor] = [
    UIColor(hex: "#FD7478"),
    UIColor(hex: "#E73B40")
  ]
  
  static let hdLegacyBreadWallet: [UIColor] = [
    UIColor(hex: "#FE6381"),
    UIColor(hex: "#F99C42")
  ]
  
  static let multisigHdWallet: [UIColor] = [
    UIColor(hex: "#1CE6EB"),
    UIColor(hex: "#296FC5"),
    UIColor(hex: "#3500A2")
  ]
  
  static let defaultGradients: [UIColor] = [
    UIColor(hex: "#B770F6"),
    UIColor(hex: "#9013FE")
  ]
  
  static let lightningCustodianWallet: [UIColor] = [
    UIColor(hex: "#F1AA07"),
    UIColor(hex: "#FD7E37")
  ]
  
  static let aezeedWallet: [UIColor] = [
    UIColor(hex: "#8584FF"),
    UIColor(hex: "#5351FB")
  ]
  
  // MARK: - Gradient Layer Creation for WatchKit
  
  /// Creates gradient colors suitable for WatchKit interface
  /// - Parameters:
  ///   - type: The wallet type
  /// - Returns: An array of UIColors for the gradient
  static func gradientColorsFor(type: WalletType) -> [UIColor] {
    return gradientsFor(type: type)
  }
  
  /// Gets the colors for a WKInterfaceGroup gradient
  /// - Parameter type: The wallet type
  /// - Returns: Colors array suitable for setting on WKInterfaceGroup
  static func getWatchKitGroupColors(for type: WalletType) -> [Any] {
    return gradientsFor(type: type).map { $0.cgColor as Any }
  }
  
  // MARK: - Gradient Selection
  
  static func gradientsFor(type: WalletType) -> [UIColor] {
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
  /// - Returns: A `UIColor` representing the header color.
  static func headerColorFor(type: WalletType) -> UIColor {
    let gradient = gradientsFor(type: type)
    return gradient.first ?? UIColor.black // Defaults to black if gradient is empty
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
