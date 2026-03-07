//
//  Handoff.swift
//  BlueWalletWatch Extension
//
//  Created by Admin on 9/27/21.
//  Copyright © 2021 BlueWallet. All rights reserved.
//

import Foundation

enum HandoffIdentifier: String {
  case ReceiveOnchain = "io.bluewallet.bluewallet.receiveonchain"
  case Xpub = "io.bluewallet.bluewallet.xpub"
  case ViewInBlockExplorer = "io.bluewallet.bluewallet.blockexplorer"
  case SendOnchain = "io.bluewallet.bluewallet.sendonchain"
  case SignVerify = "io.bluewallet.bluewallet.signverify"
  case IsItMyAddress = "io.bluewallet.bluewallet.isitmyaddress"
}

enum HandOffUserInfoKey: String {
  case ReceiveOnchain = "address"
  case Xpub = "xpub"
}

enum HandOffTitle: String {
  case ReceiveOnchain = "View Address"
  case Xpub = "View XPUB"
}
