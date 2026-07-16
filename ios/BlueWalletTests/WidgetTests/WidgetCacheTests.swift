import Testing
@testable import BlueWallet

private enum WidgetTestFixtures {
  static let currentMarketData = MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2023-01-01T00:00:00+00:00")
  static let previousMarketData = MarketData(nextBlock: "", sats: "", price: "$9,000", rate: 9000, dateString: "2022-12-31T00:00:00+00:00")
}

@Suite("Widget Cache")
struct WidgetCacheTests {
  @Test("Save promotes the previous value and loadFallback returns the latest value")
  func savePromotesPreviousValue() {
    WidgetMarketDataStore.clear()
    WidgetMarketDataStore.save(WidgetTestFixtures.currentMarketData)
    WidgetMarketDataStore.save(WidgetTestFixtures.previousMarketData)

    #expect(WidgetMarketDataStore.currentMarketData()?.price == WidgetTestFixtures.previousMarketData.price)
    #expect(WidgetMarketDataStore.currentMarketData()?.rate == WidgetTestFixtures.previousMarketData.rate)
    #expect(WidgetMarketDataStore.previousMarketData()?.price == WidgetTestFixtures.currentMarketData.price)
    #expect(WidgetMarketDataStore.previousMarketData()?.rate == WidgetTestFixtures.currentMarketData.rate)
    #expect(WidgetMarketDataStore.loadFallback().price == WidgetTestFixtures.previousMarketData.price)
  }

  @Test("Clear removes both current and cached market data")
  func clearRemovesCachedMarketData() {
    WidgetMarketDataStore.save(WidgetTestFixtures.currentMarketData)
    WidgetMarketDataStore.clear()

    #expect(WidgetMarketDataStore.currentMarketData() == nil)
    #expect(WidgetMarketDataStore.previousMarketData() == nil)
    #expect(WidgetMarketDataStore.loadFallback().price == emptyMarketData.price)
    #expect(WidgetMarketDataStore.loadFallback().rate == emptyMarketData.rate)
  }

  @Test("Fallback uses the current cache on a cold start")
  func fallbackUsesCurrentCacheOnColdStart() {
    WidgetMarketDataStore.clear()
    WidgetMarketDataStore.save(WidgetTestFixtures.currentMarketData)

    let fallback = WidgetMarketDataStore.loadFallback()

    #expect(fallback.price == WidgetTestFixtures.currentMarketData.price)
    #expect(fallback.rate == WidgetTestFixtures.currentMarketData.rate)
    #expect(fallback.nextBlock == WidgetTestFixtures.currentMarketData.nextBlock)
  }
}
