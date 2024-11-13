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
}

func fiatUnit(for currency: String) -> FiatUnit? {
    guard let fileURL = Bundle.main.url(forResource: "fiatUnits", withExtension: "json"),
          let data = try? Data(contentsOf: fileURL),
          let units = try? JSONDecoder().decode([String: FiatUnit].self, from: data) else {
        print("[FiatUnit] Error: Unable to decode fiatUnits.json")
        return nil
    }
    return units.first(where: { $1.endPointKey == currency })?.value
}
