//
//  WidgetMarketDataStore.swift
//  BlueWallet
//
//  Created by GitHub Copilot on 7/16/26.
//

import Foundation

enum WidgetMarketDataStore {
  private static let encoder = JSONEncoder()
  private static let decoder = JSONDecoder()

  private static var sharedUserDefaults: UserDefaults? {
    UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
  }

  static func currentMarketData() -> MarketData? {
    decodeMarketData(forKey: WidgetData.WidgetDataStoreKey)
  }

  static func previousMarketData() -> MarketData? {
    decodeMarketData(forKey: WidgetData.WidgetCachedDataStoreKey)
  }

  static func save(_ marketData: MarketData) {
    guard let userDefaults = sharedUserDefaults else { return }

    var marketDataToStore = marketData
    if marketDataToStore.dateString.isEmpty {
      marketDataToStore.dateString = ISO8601DateFormatter().string(from: Date())
    }

    if let currentData = userDefaults.data(forKey: WidgetData.WidgetDataStoreKey) {
      userDefaults.set(currentData, forKey: WidgetData.WidgetCachedDataStoreKey)
    }

    guard let encodedData = try? encoder.encode(marketDataToStore) else { return }

    userDefaults.set(encodedData, forKey: WidgetData.WidgetDataStoreKey)
    userDefaults.synchronize()
  }

  static func clear() {
    guard let userDefaults = sharedUserDefaults else { return }
    userDefaults.removeObject(forKey: WidgetData.WidgetDataStoreKey)
    userDefaults.removeObject(forKey: WidgetData.WidgetCachedDataStoreKey)
    userDefaults.synchronize()
  }

  static func loadFallback() -> MarketData {
    currentMarketData() ?? previousMarketData() ?? emptyMarketData
  }

  private static func decodeMarketData(forKey key: String) -> MarketData? {
    guard let data = sharedUserDefaults?.data(forKey: key) else { return nil }
    return try? decoder.decode(MarketData.self, from: data)
  }
}

enum WidgetMarketDataLoader {
  static func load(currency: String, retries: Int = 3) async -> MarketData {
    let retryCount = max(retries, 1)
    var attempt = 0

    while attempt < retryCount {
      attempt += 1

      if let liveMarketData = await fetchLiveMarketData(currency: currency) {
        WidgetMarketDataStore.save(liveMarketData)
        return liveMarketData
      }

      if attempt < retryCount {
        try? await Task.sleep(nanoseconds: 2_000_000_000)
      }
    }

    return WidgetMarketDataStore.loadFallback()
  }

  static func loadPriceData(currency: String, retries: Int = 3) async -> MarketData {
    await load(currency: currency, retries: retries)
  }

  private static func fetchLiveMarketData(currency: String) async -> MarketData? {
    async let priceResult = MarketAPI.fetchPrice(currency: currency)
    async let nextBlockResult = MarketAPI.fetchNextBlockFee()

    do {
      guard let priceData = try await priceResult,
            let formattedRate = priceData.formattedRate else {
        return nil
      }

      let nextBlockData = try? await nextBlockResult
      let rate = priceData.rateDouble
      let satsValue = rate > 0 ? Double(10 / rate) * 10_000_000 : 0
      let sats = numberFormatter.string(from: NSNumber(value: satsValue)) ?? "!"

      return MarketData(
        nextBlock: nextBlockData?.nextBlock ?? "!",
        sats: sats,
        price: formattedRate,
        rate: rate,
        dateString: priceData.lastUpdate
      )
    } catch {
      _ = try? await nextBlockResult
      return nil
    }
  }
}