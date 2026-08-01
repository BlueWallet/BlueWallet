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
                .activityBackgroundTint(.blueWalletBackground)
                .activitySystemActionForegroundColor(.white)
                .widgetURL(URL(string: "bluewallet://"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 7) {
                        BlueWalletMark(size: 25)
                        Text("BlueWallet")
                            .font(.caption.weight(.semibold))
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill")
                            .font(.caption2)
                            .foregroundStyle(Color.blueWalletAccent)
                        Text("\(context.state.pendingTransactionCount)")
                            .font(.headline.bold().monospacedDigit())
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("UNCONFIRMED ON-CHAIN")
                            .font(.caption2.weight(.semibold))
                            .tracking(0.7)
                            .foregroundStyle(.secondary)

                        Text(formatBitcoin(context.state.totalPendingSats))
                            .font(.title2.bold().monospacedDigit())
                            .contentTransition(.numericText())
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)

                        Text(pendingDescription(for: context.state.pendingTransactionCount))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 5)
                }
            } compactLeading: {
                BlueWalletMark(size: 19)
            } compactTrailing: {
                Text("\(context.state.pendingTransactionCount)")
                    .font(.caption.bold().monospacedDigit())
                    .foregroundStyle(Color.blueWalletAccent)
                    .contentTransition(.numericText())
            } minimal: {
                Text("\(context.state.pendingTransactionCount)")
                    .font(.caption2.bold().monospacedDigit())
                    .foregroundStyle(Color.blueWalletAccent)
                    .contentTransition(.numericText())
            }
            .keylineTint(.blueWalletAccent)
            .widgetURL(URL(string: "bluewallet://"))
        }
    }
}

@available(iOSApplicationExtension 16.1, *)
private struct PendingTransactionsLockScreenView: View {
    let state: PendingTransactionsAttributes.ContentState

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 9) {
                BlueWalletMark(size: 30)

                VStack(alignment: .leading, spacing: 1) {
                    Text("BlueWallet")
                        .font(.subheadline.weight(.semibold))
                    Text("Awaiting confirmation")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "clock.fill")
                    .font(.caption)
                    .foregroundStyle(Color.blueWalletAccent)
            }

            Divider()
                .overlay(Color.blueWalletAccent.opacity(0.25))

            HStack(alignment: .firstTextBaseline, spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Unconfirmed amount")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(formatBitcoin(state.totalPendingSats))
                        .font(.title2.bold().monospacedDigit())
                        .contentTransition(.numericText())
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }

                Spacer(minLength: 8)

                VStack(alignment: .trailing, spacing: 3) {
                    Text("\(state.pendingTransactionCount)")
                        .font(.title2.bold().monospacedDigit())
                        .contentTransition(.numericText())
                    Text(transactionLabel(for: state.pendingTransactionCount))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(16)
        .foregroundStyle(.white)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            "\(formatBitcoin(state.totalPendingSats)) unconfirmed in \(state.pendingTransactionCount) \(transactionLabel(for: state.pendingTransactionCount))"
        )
    }
}

@available(iOSApplicationExtension 16.1, *)
private struct BlueWalletMark: View {
    let size: CGFloat

    var body: some View {
        Image("marketing-1024x1024")
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

private extension Color {
    static let blueWalletAccent = Color(red: 0.40, green: 0.78, blue: 0.94)
    static let blueWalletBackground = Color(red: 0.035, green: 0.075, blue: 0.14)
}

private func pendingDescription(for count: Int) -> String {
    "\(count) \(transactionLabel(for: count)) awaiting confirmation"
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

#if DEBUG
@available(iOSApplicationExtension 17.0, *)
private let previewAttributes = PendingTransactionsAttributes()

@available(iOSApplicationExtension 17.0, *)
private let previewState = PendingTransactionsAttributes.ContentState(
    pendingTransactionCount: 2,
    totalPendingSats: 175_000,
    lastUpdated: .now
)

#Preview("Dynamic Island — Compact", as: .dynamicIsland(.compact), using: previewAttributes) {
    PendingTransactionsLiveActivity()
} contentStates: {
    previewState
}

#Preview("Dynamic Island — Expanded", as: .dynamicIsland(.expanded), using: previewAttributes) {
    PendingTransactionsLiveActivity()
} contentStates: {
    previewState
}

#Preview("Dynamic Island — Minimal", as: .dynamicIsland(.minimal), using: previewAttributes) {
    PendingTransactionsLiveActivity()
} contentStates: {
    previewState
}

#Preview("Lock Screen", as: .content, using: previewAttributes) {
    PendingTransactionsLiveActivity()
} contentStates: {
    previewState
}
#endif
#endif
