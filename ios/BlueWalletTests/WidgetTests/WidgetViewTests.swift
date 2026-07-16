import Testing
import SwiftUI
import UIKit
import WidgetKit
@testable import BlueWallet

private enum WidgetViewTestFixtures {
  static let suiteName = UserDefaultsGroupKey.GroupName.rawValue

  static let marketData = MarketData(
    nextBlock: "26",
    sats: "9 134",
    price: "$10,000",
    rate: 10_000,
    dateString: "2023-01-01T00:00:00+00:00"
  )

  static let previousMarketData = MarketData(
    nextBlock: "24",
    sats: "8 765",
    price: "$9,500",
    rate: 9_500,
    dateString: "2022-12-31T00:00:00+00:00"
  )

  static let walletData = WalletData(
    balance: 100_000_000,
    latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 0)
  )

  static func withStableCurrency<T>(_ body: () throws -> T) rethrows -> T {
    let userDefaults = UserDefaults(suiteName: suiteName)
    let keys = ["preferredCurrency", "preferredCurrencyLocale", "currency"]
    let originalValues = keys.reduce(into: [String: Any?]()) { partialResult, key in
      partialResult[key] = userDefaults?.object(forKey: key)
    }

    userDefaults?.set("USD", forKey: "preferredCurrency")
    userDefaults?.set("en_US", forKey: "preferredCurrencyLocale")
    userDefaults?.set("USD", forKey: "currency")

    defer {
      for key in keys {
        let originalValue = originalValues[key] ?? nil
        if let value = originalValue {
          userDefaults?.set(value, forKey: key)
        } else {
          userDefaults?.removeObject(forKey: key)
        }
      }
    }

    return try body()
  }
}

private final class HostingView<Content: View> {
  let controller: UIHostingController<Content>

  init(_ rootView: Content, size: CGSize = CGSize(width: 320, height: 320)) {
    controller = UIHostingController(rootView: rootView)
    controller.view.frame = CGRect(origin: .zero, size: size)
    controller.view.backgroundColor = .clear
    controller.view.setNeedsLayout()
    controller.view.layoutIfNeeded()
  }

  var rootView: UIView {
    controller.view
  }
}

private func allSubviews(of view: UIView) -> [UIView] {
  view.subviews.flatMap { [$0] + allSubviews(of: $0) }
}

private func labelTexts(in view: UIView) -> [String] {
  allSubviews(of: view)
    .compactMap { $0 as? UILabel }
    .compactMap { $0.text }
    .filter { !$0.isEmpty }
}

private func containsText(_ text: String, in view: UIView) -> Bool {
  labelTexts(in: view).contains(text)
}

private func containsIdentifier(_ identifier: String, in view: UIView) -> Bool {
  allSubviews(of: view).contains { $0.accessibilityIdentifier == identifier }
}

@Suite("Widget Views")
struct WidgetViewTests {
  @Test("Market widget renders the expected labels and values")
  @MainActor
  func marketWidgetRendersSnapshot() throws {
    try WidgetViewTestFixtures.withStableCurrency {
      let sut = MarketView(marketData: WidgetViewTestFixtures.marketData)
      let host = HostingView(sut)

      #expect(containsText("Market", in: host.rootView))
      #expect(containsText("Next Block", in: host.rootView))
      #expect(containsText("Sats/USD", in: host.rootView))
      #expect(containsText("Price", in: host.rootView))
      #expect(containsText("26 sat/vb", in: host.rootView))
      #expect(containsText("9 134", in: host.rootView))
      #expect(containsText("$10,000", in: host.rootView))
      #expect(containsIdentifier("market-widget-title", in: host.rootView))
      #expect(containsIdentifier("market-widget-next-block", in: host.rootView))
      #expect(containsIdentifier("market-widget-sats", in: host.rootView))
      #expect(containsIdentifier("market-widget-price", in: host.rootView))
    }
  }

  @Test("Wallet widget renders the balance and latest transaction state")
  @MainActor
  func walletWidgetRendersSnapshot() throws {
    try WidgetViewTestFixtures.withStableCurrency {
      let sut = WalletInformationView(
        allWalletsBalance: WidgetViewTestFixtures.walletData,
        marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 12_345, dateString: "2023-01-01T00:00:00+00:00")
      )
      let host = HostingView(sut)

      #expect(containsText("1 BTC", in: host.rootView))
      #expect(containsText("$12,345.00", in: host.rootView))
      #expect(containsText("Latest transaction", in: host.rootView))
      #expect(containsText("Never", in: host.rootView))
      #expect(containsIdentifier("wallet-widget-btc-balance", in: host.rootView))
      #expect(containsIdentifier("wallet-widget-fiat-balance", in: host.rootView))
      #expect(containsIdentifier("wallet-widget-latest-transaction-label", in: host.rootView))
      #expect(containsIdentifier("wallet-widget-latest-transaction-value", in: host.rootView))
    }
  }
}

@available(iOS 16.0, *)
@Suite("Price Widget Views")
struct PriceWidgetViewTests {
  private static func makeEntry(family: WidgetFamily) -> PriceWidgetEntry {
    PriceWidgetEntry(
      date: Date(timeIntervalSince1970: 1_700_000_000),
      family: family,
      currentMarketData: MarketData(
        nextBlock: "26",
        sats: "9 134",
        price: "$12,345",
        rate: 12_345,
        dateString: "2023-01-01T00:00:00+00:00"
      ),
      previousMarketData: WidgetViewTestFixtures.previousMarketData
    )
  }

  @Test("Default price widget renders the main price and timestamp")
  @MainActor
  func defaultWidgetRendersSnapshot() throws {
    try WidgetViewTestFixtures.withStableCurrency {
      let sut = PriceView(entry: Self.makeEntry(family: .systemSmall))
      let host = HostingView(sut)

      #expect(containsText("Last Updated", in: host.rootView))
      #expect(containsText("$12,345", in: host.rootView))
      #expect(containsIdentifier("price-widget-last-updated-label", in: host.rootView))
      #expect(containsIdentifier("price-widget-last-updated-value", in: host.rootView))
      #expect(containsIdentifier("price-widget-default-price-value", in: host.rootView))
    }
  }

  @Test("Accessory circular price widget renders the compact price state")
  @MainActor
  func accessoryCircularWidgetRendersSnapshot() throws {
    try WidgetViewTestFixtures.withStableCurrency {
      let sut = PriceView(entry: Self.makeEntry(family: .accessoryCircular))
      let host = HostingView(sut)

      #expect(containsText("BTC", in: host.rootView))
      #expect(containsIdentifier("price-widget-btc-label", in: host.rootView))
      #expect(containsIdentifier("price-widget-price-value", in: host.rootView))
      #expect(containsIdentifier("price-widget-change-value", in: host.rootView))
    }
  }

  @Test("Accessory inline and rectangular price widgets render their family-specific layouts")
  @MainActor
  func accessoryFamiliesRenderSnapshot() throws {
    try WidgetViewTestFixtures.withStableCurrency {
      let inlineHost = HostingView(PriceView(entry: Self.makeEntry(family: .accessoryInline)))
      #expect(containsIdentifier("price-widget-inline-price-value", in: inlineHost.rootView))

      let rectangularHost = HostingView(PriceView(entry: Self.makeEntry(family: .accessoryRectangular)))
      #expect(containsIdentifier("price-widget-rectangular-title", in: rectangularHost.rootView))
      #expect(containsIdentifier("price-widget-rectangular-price-value", in: rectangularHost.rootView))
      #expect(containsIdentifier("price-widget-rectangular-previous-price", in: rectangularHost.rootView))
      #expect(containsIdentifier("price-widget-rectangular-date", in: rectangularHost.rootView))
    }
  }
}