//
//  Wallet.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/13/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation

class Transaction: NSObject, NSCoding {
  static let identifier: String = "Transaction"
  
  let time: String
  let memo: String
  let amount: String
  let type: String
  
  init(time: String, memo: String, type: String, amount: String) {
    self.time = time
    self.memo = memo
    self.type = type
    self.amount = amount
  }
  
  func encode(with aCoder: NSCoder) {
    aCoder.encode(time, forKey: "time")
    aCoder.encode(memo, forKey: "memo")
    aCoder.encode(type, forKey: "type")
    aCoder.encode(amount, forKey: "amount")
  }
  
  required init?(coder aDecoder: NSCoder) {
    time = aDecoder.decodeObject(forKey: "time") as! String
    memo = aDecoder.decodeObject(forKey: "memo") as! String
    amount = aDecoder.decodeObject(forKey: "amount") as! String
    type = aDecoder.decodeObject(forKey: "type") as! String
  }
}
