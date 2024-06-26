//
//  BitcoinUnit.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

enum BitcoinUnit: String, Codable, CaseIterable {
    case BTC
    case SATS = "sats"
    case LOCAL_CURRENCY = "local_currency"
    case MAX
}

enum Chain: String, Codable, CaseIterable {
    case ONCHAIN
    case OFFCHAIN
}
