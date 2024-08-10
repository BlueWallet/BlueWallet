//
//  MockData.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 7/10/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

struct MockData {
    static let currentMarketData = MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2023-01-01T00:00:00+00:00")
    static let previousMarketData = MarketData(nextBlock: "", sats: "", price: "$9,000", rate: 9000, dateString: "2022-12-31T00:00:00+00:00")
    static let noChangeMarketData = MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2023-01-01T00:00:00+00:00")
}
