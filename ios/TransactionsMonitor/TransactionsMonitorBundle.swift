// TransactionsMonitorBundle.swift

import WidgetKit
import SwiftUI

@main
struct TransactionsMonitorBundle: WidgetBundle {
    var body: some Widget {
        TransactionsMonitorWidget()
        TransactionsMonitorLiveActivity()
    }
}
