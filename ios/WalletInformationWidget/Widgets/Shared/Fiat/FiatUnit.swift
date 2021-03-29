//
//  FiatUnit.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/20/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//
import Foundation

typealias FiatUnits = [FiatUnit]
struct FiatUnit: Codable {
  let endPointKey: String
  let symbol: String
  let locale: String
  let source: String
}

func fiatUnit(currency: String) -> FiatUnit? {
  guard let file = Bundle.main.path(forResource: "FiatUnits", ofType: "plist") else {
    return nil
  }
  let fileURL: URL = URL(fileURLWithPath: file)
  var fiatUnits: FiatUnits?

  if let data = try? Data(contentsOf: fileURL) {
    let decoder = PropertyListDecoder()
    fiatUnits = try? decoder.decode(FiatUnits.self, from: data)
  }
  return fiatUnits?.first(where: {$0.endPointKey == currency})
}
