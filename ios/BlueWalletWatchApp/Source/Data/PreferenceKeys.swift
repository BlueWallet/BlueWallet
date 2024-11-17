//
//  WalletRowPreferenceKey.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/16/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import SwiftUI

struct WalletRowPreferenceKey: PreferenceKey {
    typealias Value = [CGRect]

    static var defaultValue: [CGRect] = []

    static func reduce(value: inout [CGRect], nextValue: () -> [CGRect]) {
        value.append(contentsOf: nextValue())
    }
}

struct TransactionRowPreferenceKey: PreferenceKey {
    typealias Value = [CGRect]

    static var defaultValue: [CGRect] = []

    static func reduce(value: inout [CGRect], nextValue: () -> [CGRect]) {
        value.append(contentsOf: nextValue())
    }
}
