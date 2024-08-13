enum WalletType: String, Codable, CaseIterable {
    case SegwitHD = "HDsegwitP2SH"
    case Segwit = "segwitP2SH"
    case LightningCustodial = "lightningCustodianWallet"
    case LightningLDK = "lightningLdk"
    case SegwitNative = "HDsegwitBech32"
    case WatchOnly = "watchOnly"
    case MultiSig = "HDmultisig"
}
