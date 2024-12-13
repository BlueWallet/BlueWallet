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
    static var lastSuccessfulEntries: [WalletInformationAndMarketWidgetEntry] = []

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
            Task {
                let userPreferredCurrency = Currency.getUserPreferredCurrency()
                let allwalletsBalance = WalletData(balance: UserDefaultsGroup.getAllWalletsBalance(), latestTransactionTime: UserDefaultsGroup.getAllWalletsLatestTransactionTime())

                var retryCount = 0
                let maxRetries = 3
                var success = false

                while retryCount < maxRetries && !success {
                    do {
                        print("Fetching market data for currency: \(userPreferredCurrency)") 
                        let result = try await MarketAPI.fetchMarketData(currency: userPreferredCurrency)
                        let entry = WalletInformationAndMarketWidgetEntry(date: Date(), marketData: result, allWalletsBalance: allwalletsBalance)
                        WalletInformationAndMarketWidgetProvider.lastSuccessfulEntries.append(entry)
                        print("Appended new entry. Total successful entries: \(WalletInformationAndMarketWidgetProvider.lastSuccessfulEntries.count)") 
                        if WalletInformationAndMarketWidgetProvider.lastSuccessfulEntries.count > 5 {
                            WalletInformationAndMarketWidgetProvider.lastSuccessfulEntries.removeFirst()
                            print("Removed oldest entry to maintain a maximum of 5 entries.") 
                        }
                        entries.append(entry)
                        success = true
                    } catch {
                        retryCount += 1
                        print("Error fetching market data: \(error.localizedDescription). Retry \(retryCount)/\(maxRetries)") 
                        if retryCount == maxRetries {
                            print("Max retries reached. Blacklisting server.") 
                            if let lastEntry = WalletInformationAndMarketWidgetProvider.lastSuccessfulEntries.last {
                                print("Using last successful entry.") 
                                entries.append(lastEntry)
                            } else {
                                print("Using placeholder entry as fallback.") 
                                entries.append(WalletInformationAndMarketWidgetEntry.placeholder)
                            }
                        }
                    }
                }

                let timeline = Timeline(entries: entries, policy: .atEnd)
                print("Submitting timeline with \(entries.count) entries.") 
                completion(timeline)
            }
        }
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
