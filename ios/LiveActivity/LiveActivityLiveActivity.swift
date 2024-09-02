import ActivityKit
import WidgetKit
import SwiftUI

struct LiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var pendingTransactionsCount: Int
    }

    var name: String
}

struct LiveActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LiveActivityAttributes.self) { context in
            VStack {
                Text("Pending Transactions: \(context.state.pendingTransactionsCount)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("Transactions")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.pendingTransactionsCount)")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("You have \(context.state.pendingTransactionsCount) pending")
                }
            } compactLeading: {
                Text("Tx")
            } compactTrailing: {
                Text("\(context.state.pendingTransactionsCount)")
            } minimal: {
                Text("\(context.state.pendingTransactionsCount)")
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension LiveActivityAttributes {
    fileprivate static var preview: LiveActivityAttributes {
        LiveActivityAttributes(name: "Pending Transactions")
    }
}

extension LiveActivityAttributes.ContentState {
    fileprivate static var withTransactions: LiveActivityAttributes.ContentState {
        LiveActivityAttributes.ContentState(pendingTransactionsCount: 5)
    }
    
    fileprivate static var withoutTransactions: LiveActivityAttributes.ContentState {
        LiveActivityAttributes.ContentState(pendingTransactionsCount: 0)
    }
}

#Preview("Notification", as: .content, using: LiveActivityAttributes.preview) {
   LiveActivityLiveActivity()
} contentStates: {
    LiveActivityAttributes.ContentState.withTransactions
    LiveActivityAttributes.ContentState.withoutTransactions
}
