//
//  Wallet.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/13/19.

//

import Foundation

class Wallet: NSObject, NSSecureCoding {
  
  static var supportsSecureCoding: Bool = true

  static let identifier: String = "Wallet"

  var identifier: Int?
  let label: String
  let balance: String
  let type: String
  let preferredBalanceUnit: String
  let receiveAddress: String
  let transactions: [Transaction]
  let xpub: String?
  let hideBalance: Bool
  let paymentCode: String?
  
  init(label: String, balance: String, type: String, preferredBalanceUnit: String, receiveAddress: String, transactions: [Transaction], identifier: Int, xpub: String?, hideBalance: Bool = false, paymentCode: String?) {
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
  
  func encode(with aCoder: NSCoder) {
    aCoder.encode(label, forKey: "label")
    aCoder.encode(balance, forKey: "balance")
    aCoder.encode(type, forKey: "type")
    aCoder.encode(receiveAddress, forKey: "receiveAddress")
    aCoder.encode(preferredBalanceUnit, forKey: "preferredBalanceUnit")
    aCoder.encode(transactions, forKey: "transactions")
    aCoder.encode(identifier, forKey: "identifier")
    aCoder.encode(xpub, forKey: "xpub")
    aCoder.encode(hideBalance, forKey: "hideBalance")
    aCoder.encode(paymentCode, forKey: "paymentCode")
  }
  
  required init?(coder aDecoder: NSCoder) {
    label = aDecoder.decodeObject(forKey: "label") as! String
    balance = aDecoder.decodeObject(forKey: "balance") as! String
    type = aDecoder.decodeObject(forKey: "type") as! String
    preferredBalanceUnit = aDecoder.decodeObject(forKey: "preferredBalanceUnit") as! String
    receiveAddress = aDecoder.decodeObject(forKey: "receiveAddress") as! String
    transactions = aDecoder.decodeObject(forKey: "transactions") as? [Transaction] ?? [Transaction]()
    xpub = aDecoder.decodeObject(forKey: "xpub") as? String
    hideBalance = aDecoder.decodeObject(forKey: "hideBalance") as? Bool ?? false
    paymentCode = aDecoder.decodeObject(forKey: "paymentCode") as? String
  }

}
