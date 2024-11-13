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

extension FiatUnit {
    /// Known error cases for fiat unit operations
    enum FiatUnitError: Error {
        case fileNotFound
        case invalidData
        case decodingError
    }
    
    /// Cache for loaded fiat units
    private static var cachedUnits: [String: FiatUnit]?
    
    /// Returns a fiat unit for the specified currency code
    /// - Parameter currency: The currency code to look up
    /// - Returns: The matching FiatUnit if found
    /// - Throws: FiatUnitError if loading or decoding fails
    static func fiatUnit(for currency: String) throws -> FiatUnit? {
        // Return cached data if available
        if let cached = cachedUnits {
            return cached.first(where: { $1.endPointKey == currency })?.value
        }
        
        // Load and cache data
        guard let fileURL = Bundle.main.url(forResource: "fiatUnits", withExtension: "json") else {
            throw FiatUnitError.fileNotFound
        }
        
        do {
            let data = try Data(contentsOf: fileURL)
            cachedUnits = try JSONDecoder().decode([String: FiatUnit].self, from: data)
            return cachedUnits?.first(where: { $1.endPointKey == currency })?.value
        } catch {
            Logger.error("[FiatUnit] Failed to load units: \(error)")
            throw FiatUnitError.decodingError
        }
    }
}
}
