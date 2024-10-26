// TransactionsMonitorLiveActivity.swift

import ActivityKit
import WidgetKit
import SwiftUI

struct TransactionsMonitorAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct TransactionsMonitorLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TransactionsMonitorAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Monitoring Transactions")
                Text(context.state.emoji)
                    .font(.largeTitle)
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    Text("🔍")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("📈")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Status: \(context.state.emoji)")
                    // more content if needed
                }
            } compactLeading: {
                Text("🔍")
            } compactTrailing: {
                Text("📈")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.bluewallet.com"))
            .keylineTint(Color.red)
        }
    }
}

extension TransactionsMonitorAttributes {
    fileprivate static var preview: TransactionsMonitorAttributes {
        TransactionsMonitorAttributes(name: "BlueWallet")
    }
}

extension TransactionsMonitorAttributes.ContentState {
    fileprivate static var smiley: TransactionsMonitorAttributes.ContentState {
        TransactionsMonitorAttributes.ContentState(emoji: "😀")
    }
     
    fileprivate static var starEyes: TransactionsMonitorAttributes.ContentState {
        TransactionsMonitorAttributes.ContentState(emoji: "🤩")
    }
}

#Preview("Notification", as: .content, using: TransactionsMonitorAttributes.preview) {
   TransactionsMonitorLiveActivity()
} contentStates: {
    TransactionsMonitorAttributes.ContentState.smiley
    TransactionsMonitorAttributes.ContentState.starEyes
}
