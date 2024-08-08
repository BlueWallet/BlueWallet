//
//  WatchDataKeys.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 6/21/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

enum WatchDataKeys: String {
    case wallets
    case label
    case balance
    case type
    case createdAt
    case preferredBalanceUnit
    case receiveAddress
    case xpub
    case hideBalance
    case paymentCode
    case transactions
    case time
    case memo
    case amount
    case request
    case walletIndex
    case message
    case hideBalanceKey
    case donottrack
    case preferredCurrency
    case preferredFiatCurrency
    case isWalletsInitialized
    case randomID
    case id
    case description
    case invoicePaymentRequest
}

enum WatchMessageType: String {
    case createInvoice
    case hideBalance
}
