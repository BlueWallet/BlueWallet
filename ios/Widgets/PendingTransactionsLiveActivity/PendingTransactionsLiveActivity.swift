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
        } dynamicIsland: { context -> DynamicIsland in
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 7) {
                        BlueWalletAppIcon(size: 25)
                        Text("BlueWallet")
                            .font(.caption.weight(.bold))
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    PendingCountBadge(count: context.state.pendingTransactionCount)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    let direction = context.state.direction ?? .unknown
                    VStack(alignment: .leading, spacing: 11) {
                        HStack(spacing: 11) {
                            DirectionGlyph(direction: direction, size: 34)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(PendingTransactionsLocalization.directionLabel(direction))
                                    .font(.caption2.weight(.semibold))
                                    .foregroundStyle(direction.indicatorColor)
                                    .lineLimit(1)

                                BitcoinAmount(
                                    sats: context.state.totalPendingSats,
                                    fiatQuote: context.state.fiatQuote,
                                    size: 27
                                )
                            }

                            Spacer(minLength: 0)
                        }

                        Divider()
                            .overlay(.white.opacity(0.12))

                        HStack(spacing: 6) {
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(Color.blueWalletAccent)

                            Text(PendingTransactionsLocalization.awaitingNetworkConfirmation)
                                .font(.caption2.weight(.medium))
                                .foregroundStyle(.secondary)

                            Spacer(minLength: 4)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 4)
                    .padding(.top, 8)
                }
            } compactLeading: {
                let direction = context.state.direction ?? .unknown
                HStack(spacing: 4) {
                    BlueWalletAppIcon(size: 16)

                    Text("BTC")
                        .font(.caption2.bold())
                        .foregroundStyle(Color.blueWalletAccent)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(
                    PendingTransactionsLocalization.compactAccessibilityLabel(direction: direction)
                )
            } compactTrailing: {
                let direction = context.state.direction ?? .unknown
                HStack(spacing: 4) {
                    Image(systemName: direction.systemImageName)
                        .font(.system(size: 9, weight: .bold))

                    Text("\(context.state.pendingTransactionCount)")
                        .font(.caption.bold().monospacedDigit())
                        .contentTransition(.numericText())
                }
                .foregroundStyle(direction.indicatorColor)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(
                    PendingTransactionsLocalization.pendingCountAccessibilityLabel(
                        count: context.state.pendingTransactionCount
                    )
                )
            } minimal: {
                let direction = context.state.direction ?? .unknown
                DirectionGlyph(direction: direction, size: 24)
                    .accessibilityLabel(
                        "\(PendingTransactionsLocalization.directionLabel(direction)), " +
                        PendingTransactionsLocalization.pendingCountAccessibilityLabel(
                            count: context.state.pendingTransactionCount
                        )
                    )
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
        let direction = state.direction ?? .unknown
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 9) {
                BlueWalletAppIcon(size: 32)

                VStack(alignment: .leading, spacing: 1) {
                    Text("BlueWallet")
                        .font(.subheadline.weight(.bold))
                    Text(PendingTransactionsLocalization.pendingOnChain)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                TransactionDirectionBadge(direction: direction)
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(PendingTransactionsLocalization.unconfirmedAmount)
                    .font(.caption2.weight(.semibold))
                    .tracking(0.7)
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)

                BitcoinAmount(sats: state.totalPendingSats, fiatQuote: state.fiatQuote, size: 32)
            }

            HStack(spacing: 8) {
                PendingCountBadge(count: state.pendingTransactionCount)

                Text(PendingTransactionsLocalization.awaitingNetworkConfirmation)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)

                Spacer(minLength: 4)
            }
        }
        .padding(16)
        .foregroundStyle(.white)
        .background {
            LinearGradient(
                colors: [Color.blueWalletAccent.opacity(0.12), .clear],
                startPoint: .topTrailing,
                endPoint: .bottomLeading
            )
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            PendingTransactionsLocalization.lockScreenAccessibilityLabel(
                bitcoinAmount: formatBitcoin(state.totalPendingSats),
                count: state.pendingTransactionCount,
                direction: direction
            )
        )
    }
}

@available(iOSApplicationExtension 16.1, *)
private struct BlueWalletAppIcon: View {
    let size: CGFloat

    var body: some View {
        Image("BlueWalletAppIcon")
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
private struct TransactionDirectionBadge: View {
    let direction: PendingTransactionDirection

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: direction.systemImageName)
                .font(.system(size: 9, weight: .bold))

            Text(PendingTransactionsLocalization.directionLabel(direction))
                .font(.caption2.weight(.semibold))
                .lineLimit(1)
        }
        .foregroundStyle(direction.indicatorColor)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(direction.indicatorColor.opacity(0.14), in: Capsule())
        .overlay {
            Capsule()
                .strokeBorder(direction.indicatorColor.opacity(0.24), lineWidth: 0.5)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(PendingTransactionsLocalization.directionLabel(direction))
    }
}

@available(iOSApplicationExtension 16.1, *)
private struct DirectionGlyph: View {
    let direction: PendingTransactionDirection
    let size: CGFloat

    var body: some View {
        Image(systemName: direction.systemImageName)
            .font(.system(size: size * 0.4, weight: .bold))
            .foregroundStyle(direction.indicatorColor)
            .frame(width: size, height: size)
            .background(direction.indicatorColor.opacity(0.16), in: Circle())
            .overlay {
                Circle()
                    .strokeBorder(direction.indicatorColor.opacity(0.26), lineWidth: 0.5)
            }
            .accessibilityHidden(true)
    }
}

@available(iOSApplicationExtension 16.1, *)
private struct PendingCountBadge: View {
    let count: Int

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "clock")
                .font(.system(size: 10, weight: .bold))

            Text("\(count)")
                .font(.caption.bold().monospacedDigit())
                .contentTransition(.numericText())
        }
        .foregroundStyle(Color.blueWalletAccent)
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(Color.blueWalletAccent.opacity(0.14), in: Capsule())
        .overlay {
            Capsule()
                .strokeBorder(Color.blueWalletAccent.opacity(0.22), lineWidth: 0.5)
        }
        .accessibilityLabel(PendingTransactionsLocalization.pendingCountAccessibilityLabel(count: count))
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
                    .font(.system(size: size, weight: .semibold, design: .rounded).monospacedDigit())
                    .contentTransition(.numericText())
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Text("BTC")
                    .font(.caption2.weight(.bold))
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

@available(iOSApplicationExtension 16.1, *)
private extension PendingTransactionDirection {
    var systemImageName: String {
        switch self {
        case .receiving:
            return "arrow.down.left"
        case .sending:
            return "arrow.up.right"
        case .mixed:
            return "arrow.left.arrow.right"
        case .unknown:
            return "clock.fill"
        }
    }

    var indicatorColor: Color {
        switch self {
        case .receiving:
            return Color(red: 0.25, green: 0.78, blue: 0.48)
        case .sending:
            return Color(red: 1.0, green: 0.61, blue: 0.24)
        case .mixed:
            return Color(red: 0.69, green: 0.52, blue: 1.0)
        case .unknown:
            return .blueWalletAccent
        }
    }
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
    direction: .mixed,
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
