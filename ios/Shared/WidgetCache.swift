//
//  WidgetCache.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 2025.
//  Copyright © 2025 BlueWallet. All rights reserved.
//

import Foundation

// MARK: - Cache Keys

enum WidgetCacheKey: String {
    case priceWidget = "cache_price_widget"
    case marketWidget = "cache_market_widget"
    case walletInformation = "cache_wallet_info"
    case walletInformationAndMarket = "cache_wallet_info_market"
}

// MARK: - Cached Data Types

struct CachedPriceData: Codable {
    let currentMarketData: MarketData
    let previousMarketData: MarketData
}

struct CachedWalletInfo: Codable {
    let marketData: MarketData
    let walletData: WalletData
}

// MARK: - WidgetCache

enum WidgetCache {

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
    }

    // MARK: - Generic Operations

    static func save<T: Codable>(_ data: T, forKey key: WidgetCacheKey) {
        guard let encoded = try? JSONEncoder().encode(data) else { return }
        defaults?.set(encoded, forKey: key.rawValue)
    }

    static func load<T: Codable>(_ type: T.Type, forKey key: WidgetCacheKey) -> T? {
        guard let data = defaults?.data(forKey: key.rawValue) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    static func clear(forKey key: WidgetCacheKey) {
        defaults?.removeObject(forKey: key.rawValue)
    }

    // MARK: - Price Widget

    static func savePriceData(current: MarketData, previous: MarketData) {
        save(CachedPriceData(currentMarketData: current, previousMarketData: previous), forKey: .priceWidget)
    }

    static func loadPriceData() -> CachedPriceData? {
        load(CachedPriceData.self, forKey: .priceWidget)
    }

    // MARK: - Market Widget

    static func saveMarketData(_ marketData: MarketData) {
        save(marketData, forKey: .marketWidget)
    }

    static func loadMarketData() -> MarketData? {
        load(MarketData.self, forKey: .marketWidget)
    }

    // MARK: - Wallet Information Widgets

    static func saveWalletInfo(marketData: MarketData, walletData: WalletData, key: WidgetCacheKey = .walletInformation) {
        save(CachedWalletInfo(marketData: marketData, walletData: walletData), forKey: key)
    }

    static func loadWalletInfo(key: WidgetCacheKey = .walletInformation) -> CachedWalletInfo? {
        load(CachedWalletInfo.self, forKey: key)
    }
}
