//
//  FiatUnit.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/20/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//
import Foundation

struct FiatUnit: Codable {
  let endPointKey: String
  let symbol: String
  let locale: String
  let source: String
  let country: String?
}

func fiatUnit(currency: String) -> FiatUnit? {
  return Bundle.main.decode([String: FiatUnit].self, from: "fiatUnits.json").first(where: {$1.endPointKey == currency})?.value
}
