#if canImport(ActivityKit) && os(iOS) && !targetEnvironment(macCatalyst)
import ActivityKit
import Foundation
import SwiftUI
import WidgetKit

@available(iOSApplicationExtension 16.1, *)
struct PendingTransactionsLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PendingTransactionsAttributes.self) { context in
            PendingTransactionsLockScreenView(state: context.state)
                .activityBackgroundTint(Color(red: 0.04, green: 0.10, blue: 0.18))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(URL(string: "bluewallet://"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    PendingBitcoinMark()
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("\(context.state.pendingTransactionCount)")
                            .font(.headline.monospacedDigit())
                        Text(transactionLabel(for: context.state.pendingTransactionCount))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                DynamicIslandExpandedRegion(.center) {
                    Text("On-chain pending")
                        .font(.caption.weight(.semibold))
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(formatBitcoin(context.state.totalPendingSats))
                            .font(.title3.bold().monospacedDigit())
                        Spacer()
                        Label("Unconfirmed", systemImage: "clock")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                Image(systemName: "bitcoinsign")
                    .foregroundStyle(.orange)
            } compactTrailing: {
                Text("\(context.state.pendingTransactionCount)")
                    .font(.caption.bold().monospacedDigit())
            } minimal: {
                ZStack {
                    Circle().fill(.orange)
                    Text("\(context.state.pendingTransactionCount)")
                        .font(.caption2.bold().monospacedDigit())
                        .foregroundStyle(.black)
                }
            }
            .keylineTint(.orange)
            .widgetURL(URL(string: "bluewallet://"))
        }
    }
}

@available(iOSApplicationExtension 16.1, *)
private struct PendingTransactionsLockScreenView: View {
    let state: PendingTransactionsAttributes.ContentState

    var body: some View {
        HStack(spacing: 14) {
            PendingBitcoinMark()

            VStack(alignment: .leading, spacing: 3) {
                Text("Pending on-chain")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(formatBitcoin(state.totalPendingSats))
                    .font(.title2.bold().monospacedDigit())
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 3) {
                Text("\(state.pendingTransactionCount)")
                    .font(.title2.bold().monospacedDigit())
                Text(transactionLabel(for: state.pendingTransactionCount))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .foregroundStyle(.white)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            "\(formatBitcoin(state.totalPendingSats)) unconfirmed in \(state.pendingTransactionCount) \(transactionLabel(for: state.pendingTransactionCount))"
        )
    }
}

@available(iOSApplicationExtension 16.1, *)
private struct PendingBitcoinMark: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(.orange)
                .frame(width: 40, height: 40)
            Image(systemName: "bitcoinsign")
                .font(.title3.bold())
                .foregroundStyle(.black)
        }
        .accessibilityHidden(true)
    }
}

private func transactionLabel(for count: Int) -> String {
    count == 1 ? "transaction" : "transactions"
}

private func formatBitcoin(_ sats: Int64) -> String {
    let bitcoin = Decimal(sats) / Decimal(100_000_000)
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = 8
    formatter.usesGroupingSeparator = true
    return "\(formatter.string(from: NSDecimalNumber(decimal: bitcoin)) ?? "0") BTC"
}
#endif
