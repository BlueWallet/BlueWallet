import SwiftUI

struct TransactionTableRowView: View {
    var transaction: WalletTransaction

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(transaction.amount)
                Text(transaction.memo)
                Text(transaction.time)
                    .foregroundColor(transaction.type == .Pending ? .orange : .primary)
            }
            Spacer()
            Image(systemName: icon(for: transaction.type))
                .foregroundColor(foregroundColor(for: transaction.type))
                .background(backgroundColor(for: transaction.type))
                .clipShape(Circle())
        }
        .padding()
        .background(backgroundColor(for: transaction.type))
        .cornerRadius(8)
    }

    private func icon(for type: WalletTransactionType) -> String {
        switch type {
        case .Pending:
            return "clock"
        case .Received:
            return "arrow.down.left.circle"
        case .Sent:
            return "arrow.up.right.circle"
        }
    }

    private func foregroundColor(for type: WalletTransactionType) -> Color {
        switch type {
        case .Pending:
            return .orange
        case .Received:
            return Color(hex: "#37c0a1")
        case .Sent:
            return Color(hex: "#d0021b")
        }
    }

    private func backgroundColor(for type: WalletTransactionType) -> Color {
        switch type {
        case .Pending:
            return Color.orange.opacity(0.2)
        case .Received:
            return Color(hex: "#d2f8d6")
        case .Sent:
            return Color(hex: "#f8d2d2")
        }
    }
}

struct TransactionTableRowView_Previews: PreviewProvider {
    static var previews: some View {
        TransactionTableRowView(transaction: SampleData.createSampleWallet().transactions.first!)
    }
}
