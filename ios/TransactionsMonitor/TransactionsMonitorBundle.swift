//
//  TransactionsMonitorBundle.swift
//  TransactionsMonitor
//
//  Created by Marcos Rodriguez on 10/26/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

@main
struct TransactionsMonitorBundle: WidgetBundle {
    var body: some Widget {
        TransactionsMonitor()
        TransactionsMonitorLiveActivity()
    }
}
