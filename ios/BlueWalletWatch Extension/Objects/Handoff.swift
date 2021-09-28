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
}

enum HandOffUserInfoKey: String {
  case ReceiveOnchain = "address"
  case Xpub = "xpub"
}
