//
//  WalletInformationAndMarketWidget.swift
//  WalletInformationAndMarketWidget
//
//  Created by Marcos Rodriguez on 10/29/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

struct WalletInformationAndMarketWidgetProvider: TimelineProvider {
    typealias Entry = WalletInformationAndMarketWidgetEntry

    actor LastSuccessfulEntryStore {
        private var lastSuccessfulEntry: WalletInformationAndMarketWidgetEntry?

        func getLastSuccessfulEntry() -> WalletInformationAndMarketWidgetEntry? {
            return lastSuccessfulEntry
        }

        func setLastSuccessfulEntry(_ entry: WalletInformationAndMarketWidgetEntry) {
            lastSuccessfulEntry = entry
        }
    }

    let entryStore = LastSuccessfulEntryStore()

    func placeholder(in context: Context) -> WalletInformationAndMarketWidgetEntry {
        return WalletInformationAndMarketWidgetEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (WalletInformationAndMarketWidgetEntry) -> ()) {
        let entry: WalletInformationAndMarketWidgetEntry
        if (context.isPreview) {
            entry = WalletInformationAndMarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000), allWalletsBalance: WalletData(balance: 1000000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)))
        } else {
            entry = WalletInformationAndMarketWidgetEntry(date: Date(), marketData: emptyMarketData)
        }
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [WalletInformationAndMarketWidgetEntry] = []
        if (context.isPreview) {
            let entry = WalletInformationAndMarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000), allWalletsBalance: WalletData(balance: 1000000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)))
            entries.append(entry)
            let timeline = Timeline(entries: entries, policy: .atEnd)
            completion(timeline)
        } else {
            let userPreferredCurrency = Currency.getUserPreferredCurrency()
            let allWalletsBalance = WalletData(balance: UserDefaultsGroup.getAllWalletsBalance(), latestTransactionTime: UserDefaultsGroup.getAllWalletsLatestTransactionTime())

            fetchMarketDataWithRetry(currency: userPreferredCurrency, retries: 3) { marketData in
                let entry = WalletInformationAndMarketWidgetEntry(date: Date(), marketData: marketData, allWalletsBalance: allWalletsBalance)
                Task {
                    await entryStore.setLastSuccessfulEntry(entry)
                    entries.append(entry)
                    let timeline = Timeline(entries: entries, policy: .atEnd)
                    completion(timeline)
                }
            }
        }
    }

    private func fetchMarketDataWithRetry(currency: String, retries: Int, completion: @escaping (MarketData) -> ()) {
        var attempt = 0

        func attemptFetch() {
            attempt += 1
            print("Attempt \(attempt) to fetch market data.")

          MarketAPI.fetchMarketData(currency: currency) { result in
                switch result {
                case .success(let marketData):
                    print("Successfully fetched market data on attempt \(attempt).")
                    completion(marketData)
                case .failure(let error):
                    print("Error fetching market data: \(error.localizedDescription). Retry \(attempt)/\(retries)")
                    if attempt < retries {
                        DispatchQueue.global().asyncAfter(deadline: .now() + 2) {
                            attemptFetch()
                        }
                    } else {
                        print("Max retries reached.")
                        Task {
                            if let lastEntry = await entryStore.getLastSuccessfulEntry() {
                                completion(lastEntry.marketData)
                            } else {
                                completion(WalletInformationAndMarketWidgetEntry.placeholder.marketData)
                            }
                        }
                    }
                }
            }
        }

        attemptFetch()
    }
}

struct WalletInformationAndMarketWidgetEntry: TimelineEntry {
    let date: Date
    let marketData: MarketData
    var allWalletsBalance: WalletData = WalletData(balance: 0)
    static var placeholder = WalletInformationAndMarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0), allWalletsBalance: WalletData(balance: 0, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)))
}

struct WalletInformationAndMarketWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: WalletInformationAndMarketWidgetEntry

    var WalletBalance: some View {
        WalletInformationView(allWalletsBalance: entry.allWalletsBalance, marketData: entry.marketData).background(Color.widgetBackground)
    }

    var MarketStack: some View {
        MarketView(marketData: entry.marketData)
    }

    var SendReceiveButtonsView: some View {
        SendReceiveButtons().padding(.all, 10)
    }

    var body: some View {
        if family == .systemLarge {
            HStack(alignment: .center, spacing: nil, content: {
                VStack(alignment: .leading, spacing: nil, content: {
                    HStack(content: {
                        WalletBalance.padding()
                    }).background(Color.widgetBackground)
                    HStack(content: {
                        MarketStack
                    }).padding()
                    SendReceiveButtonsView
                }).background(Color(.lightGray).opacity(0.77))
            })
        } else {
            HStack(content: {
                WalletBalance.padding()
                HStack(content: {
                    MarketStack.padding()
                }).background(Color(.lightGray).opacity(0.77))
            }).background(Color.widgetBackground)
        }
    }
}

struct WalletInformationAndMarketWidget: Widget {
    let kind: String = "WalletInformationAndMarketWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WalletInformationAndMarketWidgetProvider()) { entry in
            WalletInformationAndMarketWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Wallet and Market")
        .description("View your total wallet balance and network prices.").supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabledIfAvailable()
    }
}

struct WalletInformationAndMarketWidget_Previews: PreviewProvider {
    static var previews: some View {
        WalletInformationAndMarketWidgetEntryView(entry: WalletInformationAndMarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 0), allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000))))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
        WalletInformationAndMarketWidgetEntryView(entry: WalletInformationAndMarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 0), allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000))))
            .previewContext(WidgetPreviewContext(family: .systemLarge))
    }
}
