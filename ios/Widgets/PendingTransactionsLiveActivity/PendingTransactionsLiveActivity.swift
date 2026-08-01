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
                    HStack(spacing: 8) {
                        BlueWalletAppIcon(size: 27)
                        Text("BlueWallet")
                            .font(.caption.weight(.bold))
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    PendingCountBadge(count: context.state.pendingTransactionCount)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 9) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Unconfirmed amount")
                                .font(.caption2.weight(.medium))
                                .foregroundStyle(.secondary)

                            BitcoinAmount(
                                sats: context.state.totalPendingSats,
                                fiatQuote: context.state.fiatQuote,
                                size: 27
                            )
                        }

                        HStack(spacing: 6) {
                            Image(systemName: "clock.fill")
                                .font(.caption2)
                                .foregroundStyle(Color.blueWalletAccent)

                            Text("Awaiting network confirmation")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.secondary)

                            Spacer(minLength: 4)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 3)
                    .padding(.top, 9)
                }
            } compactLeading: {
                BlueWalletAppIcon(size: 20)
            } compactTrailing: {
                HStack(spacing: 3) {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 9, weight: .bold))

                    Text("\(context.state.pendingTransactionCount)")
                        .font(.caption.bold().monospacedDigit())
                        .contentTransition(.numericText())
                }
                .foregroundStyle(Color.blueWalletAccent)
            } minimal: {
                ZStack {
                    Circle()
                        .fill(Color.blueWalletAccent.opacity(0.18))

                    Text("\(context.state.pendingTransactionCount)")
                        .font(.caption2.bold().monospacedDigit())
                        .foregroundStyle(Color.blueWalletAccent)
                        .contentTransition(.numericText())
                }
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
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                BlueWalletAppIcon(size: 34)

                VStack(alignment: .leading, spacing: 1) {
                    Text("BlueWallet")
                        .font(.subheadline.weight(.bold))
                    Text("Pending on-chain")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                PendingCountBadge(count: state.pendingTransactionCount)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("UNCONFIRMED AMOUNT")
                    .font(.caption2.weight(.semibold))
                    .tracking(0.6)
                    .foregroundStyle(.secondary)

                BitcoinAmount(sats: state.totalPendingSats, fiatQuote: state.fiatQuote, size: 30)
            }

            HStack(spacing: 6) {
                Image(systemName: "clock.fill")
                    .font(.caption2)
                    .foregroundStyle(Color.blueWalletAccent)

                Text(pendingDescription(for: state.pendingTransactionCount))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)

                Spacer(minLength: 4)
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
private struct BlueWalletAppIcon: View {
    let size: CGFloat

    var body: some View {
        Image("BlueWallet-1024")
            .resizable()
            .scaledToFill()
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.225, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: size * 0.225, style: .continuous)
                    .strokeBorder(.white.opacity(0.14), lineWidth: 0.5)
            }
            .accessibilityHidden(true)
    }
}

@available(iOSApplicationExtension 16.1, *)
private struct PendingCountBadge: View {
    let count: Int

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "clock.fill")
                .font(.system(size: 10, weight: .semibold))

            Text("\(count)")
                .font(.caption.bold().monospacedDigit())
                .contentTransition(.numericText())
        }
        .foregroundStyle(Color.blueWalletAccent)
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(Color.blueWalletAccent.opacity(0.14), in: Capsule())
        .accessibilityLabel("\(count) pending \(transactionLabel(for: count))")
    }
}

@available(iOSApplicationExtension 16.1, *)
private struct BitcoinAmount: View {
    let sats: Int64
    let fiatQuote: PendingTransactionsAttributes.FiatQuote?
    let size: CGFloat

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text(formatBitcoinValue(sats))
                    .font(.system(size: size, weight: .bold, design: .rounded).monospacedDigit())
                    .contentTransition(.numericText())
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Text("BTC")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color.blueWalletAccent)
            }

            if let fiatValue = PendingTransactionsFiatFormatter.format(sats: sats, quote: fiatQuote) {
                Text(fiatValue)
                    .font(.caption.weight(.medium).monospacedDigit())
                    .foregroundStyle(.secondary)
                    .contentTransition(.numericText())
                    .lineLimit(1)
            }
        }
    }
}

private extension Color {
    static let blueWalletAccent = Color(red: 0.35, green: 0.62, blue: 1.0)
    static let blueWalletBackground = Color(red: 0.035, green: 0.075, blue: 0.15)
}

private func pendingDescription(for count: Int) -> String {
    "\(count) \(transactionLabel(for: count)) awaiting confirmation"
}

private func transactionLabel(for count: Int) -> String {
    count == 1 ? "transaction" : "transactions"
}

private func formatBitcoin(_ sats: Int64) -> String {
    "\(formatBitcoinValue(sats)) BTC"
}

private func formatBitcoinValue(_ sats: Int64) -> String {
    let bitcoin = Decimal(sats) / Decimal(100_000_000)
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = 8
    formatter.usesGroupingSeparator = true
    return formatter.string(from: NSDecimalNumber(decimal: bitcoin)) ?? "0"
}

#if DEBUG
@available(iOSApplicationExtension 17.0, *)
private let previewAttributes = PendingTransactionsAttributes()

@available(iOSApplicationExtension 17.0, *)
private let previewState = PendingTransactionsAttributes.ContentState(
    pendingTransactionCount: 2,
    totalPendingSats: 175_000,
    lastUpdated: .now,
    fiatQuote: PendingTransactionsAttributes.FiatQuote(
        currencyCode: "USD",
        localeIdentifier: "en_US",
        rate: 67_500
    )
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
