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

    static func decode(from decoder: Decoder) throws -> [String: FiatUnit] {
        let container = try decoder.singleValueContainer()
        return try container.decode([String: FiatUnit].self)
    }
}

func fiatUnit(currency: String) -> FiatUnit? {
    guard let path = Bundle.main.path(forResource: "fiatUnits", ofType: "json") else { return nil }
    let url = URL(fileURLWithPath: path)

    do {
        let data = try Data(contentsOf: url)
        let decoder = JSONDecoder()
        let fiatUnits = try FiatUnit.decode(from: decoder as! Decoder)
        return fiatUnits.first(where: { $1.endPointKey == currency })?.value
    } catch {
        print("Error decoding fiat units: \(error)")
        return nil
    }
}
