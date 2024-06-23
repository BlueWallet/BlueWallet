//
//  WalletType.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 6/22/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

enum WalletType: String, Codable {
    case SegwitHD = "HDsegwitP2SH"
    case Segwit = "segwitP2SH"
    case LightningCustodial = "lightningCustodianWallet"
    case LightningLDK = "lightningLdk"
    case SegwitNative = "HDsegwitBech32"
    case WatchOnly = "watchOnly"
    case MultiSig = "HDmultisig"
}
