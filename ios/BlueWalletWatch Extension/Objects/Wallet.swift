//
//  Wallet.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/13/19.
//

import Foundation

struct Wallet: Codable {
  let identifier: String
    let label: String
    let balance: String
    let type: String
    let preferredBalanceUnit: String
    let receiveAddress: String
    let transactions: [Transaction]
    let xpub: String?
    let hideBalance: Bool
    let paymentCode: String?

    init(label: String, balance: String, type: String, preferredBalanceUnit: String, receiveAddress: String, transactions: [Transaction], identifier: String, xpub: String?, hideBalance: Bool = false, paymentCode: String?) {
        self.label = label
        self.balance = balance
        self.type = type
        self.preferredBalanceUnit = preferredBalanceUnit
        self.receiveAddress = receiveAddress
        self.transactions = transactions
        self.identifier = identifier
        self.xpub = xpub
        self.hideBalance = hideBalance
        self.paymentCode = paymentCode
    }
}
