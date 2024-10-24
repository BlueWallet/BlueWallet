//
//  Transaction.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/13/19.
//

import Foundation

struct Transaction: Codable {
    let time: String
    let memo: String
    let type: String
    let amount: String

    init(time: String, memo: String, type: String, amount: String) {
        self.time = time
        self.memo = memo
        self.type = type
        self.amount = amount
    }
}
