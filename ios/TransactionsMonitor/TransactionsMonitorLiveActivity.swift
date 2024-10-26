//
//  TransactionsMonitorLiveActivity.swift
//  TransactionsMonitor
//
//  Created by Marcos Rodriguez on 10/26/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

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
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension TransactionsMonitorAttributes {
    fileprivate static var preview: TransactionsMonitorAttributes {
        TransactionsMonitorAttributes(name: "World")
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
