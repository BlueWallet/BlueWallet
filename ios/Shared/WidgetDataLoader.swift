//
//  WidgetDataLoader.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 2025.
//  Copyright © 2025 BlueWallet. All rights reserved.
//

import Foundation
import WidgetKit

// MARK: - Loaded Data Types

struct PriceDataResult {
    let current: MarketData
    let previous: MarketData
}

struct WalletDataResult {
    let marketData: MarketData
    let walletData: WalletData
}

// MARK: - WidgetDataLoader

/// Centralized data loader for all widgets.
/// Manages a unified fallback chain: network → in-memory → disk cache → empty/placeholder.
/// Providers call a single method; the loader internally determines what data to deliver.
actor WidgetDataLoader {
    static let shared = WidgetDataLoader()

    // In-memory caches
    private var priceCache: PriceDataResult?
    private var marketCache: MarketData?
    private var walletCaches: [WidgetCacheKey: WalletDataResult] = [:]

    // MARK: - Price Data (PriceWidget)

    /// Loads price data with full fallback chain: network → memory → disk → empty.
    func loadPriceData() async -> PriceDataResult {
        syncCurrencyIfNeeded()
        let currency = Currency.getUserPreferredCurrency()

        do {
            if let data = try await MarketAPI.fetchPrice(currency: currency),
               let formattedRate = data.formattedRate {
                let current = MarketData(
                    nextBlock: "",
                    sats: "",
                    price: formattedRate,
                    rate: data.rateDouble,
                    dateString: data.lastUpdate
                )
                let previous = priceCache?.current ?? emptyMarketData
                let result = PriceDataResult(current: current, previous: previous)
                priceCache = result
                WidgetCache.savePriceData(current: current, previous: previous)
                return result
            }
        } catch {
            // Fall through to cached data
        }

        return cachedPriceData()
    }

    /// Returns cached price data (memory → disk → empty). No network call.
    func cachedPriceData() -> PriceDataResult {
        if let memory = priceCache { return memory }
        if let disk = WidgetCache.loadPriceData() {
            let result = PriceDataResult(current: disk.currentMarketData, previous: disk.previousMarketData)
            priceCache = result
            return result
        }
        return PriceDataResult(current: emptyMarketData, previous: emptyMarketData)
    }

    // MARK: - Market Data (MarketWidget)

    /// Loads market data with full fallback chain: network → memory → disk → empty.
    func loadMarketData() async -> MarketData {
        let currency = Currency.getUserPreferredCurrency()

        do {
            let marketData = try await MarketAPI.fetchMarketData(currency: currency)
            marketCache = marketData
            WidgetCache.saveMarketData(marketData)
            return marketData
        } catch {
            // Fall through to cached data
        }

        return cachedMarketData()
    }

    /// Returns cached market data (memory → disk → empty). No network call.
    func cachedMarketData() -> MarketData {
        if let memory = marketCache { return memory }
        if let disk = WidgetCache.loadMarketData() {
            marketCache = disk
            return disk
        }
        return emptyMarketData
    }

    // MARK: - Wallet + Price Data (WalletInformationWidget)

    /// Loads wallet balance and price data for the WalletInformationWidget.
    /// Uses fetchPrice (not full market data).
    func loadWalletAndPriceData(cacheKey: WidgetCacheKey = .walletInformation) async -> WalletDataResult {
        let currency = Currency.getUserPreferredCurrency()
        let walletData = currentWalletData()

        do {
            if let priceResult = try await MarketAPI.fetchPrice(currency: currency) {
                let marketData = MarketData(
                    nextBlock: "",
                    sats: "",
                    price: priceResult.formattedRate ?? "!",
                    rate: priceResult.rateDouble
                )
                let result = WalletDataResult(marketData: marketData, walletData: walletData)
                walletCaches[cacheKey] = result
                WidgetCache.saveWalletInfo(marketData: marketData, walletData: walletData, key: cacheKey)
                return result
            }
        } catch {
            // Fall through to cached data
        }

        return cachedWalletData(cacheKey: cacheKey)
    }

    // MARK: - Wallet + Market Data (WalletInformationAndMarketWidget)

    /// Loads wallet balance and full market data for the WalletInformationAndMarketWidget.
    /// Uses fetchMarketData (includes nextBlock, sats, price).
    func loadWalletAndMarketData(cacheKey: WidgetCacheKey = .walletInformationAndMarket) async -> WalletDataResult {
        let currency = Currency.getUserPreferredCurrency()
        let walletData = currentWalletData()

        do {
            let marketData = try await MarketAPI.fetchMarketData(currency: currency)
            let result = WalletDataResult(marketData: marketData, walletData: walletData)
            walletCaches[cacheKey] = result
            WidgetCache.saveWalletInfo(marketData: marketData, walletData: walletData, key: cacheKey)
            return result
        } catch {
            // Fall through to cached data
        }

        return cachedWalletData(cacheKey: cacheKey)
    }

    /// Returns cached wallet data (memory → disk → placeholder). No network call.
    func cachedWalletData(cacheKey: WidgetCacheKey) -> WalletDataResult {
        if let memory = walletCaches[cacheKey] { return memory }
        if let disk = WidgetCache.loadWalletInfo(key: cacheKey) {
            let result = WalletDataResult(marketData: disk.marketData, walletData: disk.walletData)
            walletCaches[cacheKey] = result
            return result
        }
        return WalletDataResult(marketData: emptyMarketData, walletData: emptyWalletData)
    }

    // MARK: - Helpers

    private func syncCurrencyIfNeeded() {
        let preferred = Currency.getUserPreferredCurrency()
        if preferred != Currency.getLastSelectedCurrency() {
            Currency.saveNewSelectedCurrency()
        }
    }

    private func currentWalletData() -> WalletData {
        WalletData(
            balance: UserDefaultsGroup.getAllWalletsBalance(),
            latestTransactionTime: UserDefaultsGroup.getAllWalletsLatestTransactionTime()
        )
    }
}
