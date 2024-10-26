// LiveActivityManager.swift

import ActivityKit
import WidgetKit
import SwiftUI

@objc(LiveActivityManager)
class LiveActivityManager: NSObject {
    
    func startPersistentLiveActivity() {
        let attributes = TransactionsMonitorAttributes(name: "BlueWallet")
        let contentState = TransactionsMonitorAttributes.ContentState(emoji: "😀")
        
        do {
            let activity = try Activity<TransactionsMonitorAttributes>.request(
                attributes: attributes,
                contentState: contentState,
                pushType: nil
            )
            print("Live Activity started with ID: \(activity.id)")
        } catch (let error) {
            print("Error starting Live Activity: \(error.localizedDescription)")
        }
    }
    
    func endPersistentLiveActivity() {
        for activity in Activity<TransactionsMonitorAttributes>.activities {
            Task {
                await activity.end(dismissalPolicy: .immediate)
                print("Live Activity ended with ID: \(activity.id)")
            }
        }
    }
}
