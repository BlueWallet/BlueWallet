//
//  WalletInformationView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/3/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI
import WidgetKit

struct WalletInformationView: View {
    var allWalletsBalance: WalletData = emptyWalletData
    var marketData: MarketData = emptyMarketData

    var formattedBalance: String {
        let numberFormatter = NumberFormatter()
        numberFormatter.locale = Locale(identifier: Currency.getUserPreferredCurrencyLocale())
        numberFormatter.numberStyle = .currency
        let amount = numberFormatter.string(from: NSNumber(value: ((allWalletsBalance.balance / 100000000) * marketData.rate))) ?? ""
        return amount
    }

    var formattedLatestTransactionTime: String {
        if allWalletsBalance.latestTransactionTime.isUnconfirmed == true {
            return String(localized: "Pending...")
        } else if allWalletsBalance.latestTransactionTime.epochValue == 0 {
            return String(localized: "Never")
        }
        guard let epochValue = allWalletsBalance.latestTransactionTime.epochValue else {
            return String(localized: "Never")
        }
        let forDate = Date(timeIntervalSince1970: TimeInterval(epochValue / 1000))
        let dateFormatter = RelativeDateTimeFormatter()
        dateFormatter.locale = Locale.current
        dateFormatter.dateTimeStyle = .numeric
        return dateFormatter.localizedString(for: forDate, relativeTo: Date())
    }

    var body: some View {
        VStack(alignment: .leading) {
            Text(allWalletsBalance.formattedBalanceBTC)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.textColorLightGray)
                .lineLimit(1)
                .minimumScaleFactor(0.01)

            Text(formattedBalance)
                .lineLimit(1)
                .foregroundStyle(Color.textColor)
                .font(.system(size: 28, weight: .bold))
                .minimumScaleFactor(0.01)

            Spacer()

            Text("Latest transaction")
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(Color.textColorLightGray)
            Text(formattedLatestTransactionTime)
                .lineLimit(1)
                .foregroundStyle(Color.textColor)
                .font(.system(size: 13, weight: .regular))
                .minimumScaleFactor(0.01)
        }
        .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity, alignment: .topLeading)
    }
}

#Preview("Wallet Information View") {
    WalletInformationView(
        allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)),
        marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: Double(13000))
    )
    .previewContext(WidgetPreviewContext(family: .systemSmall))
}
