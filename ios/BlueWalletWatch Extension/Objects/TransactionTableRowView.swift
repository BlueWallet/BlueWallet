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
        }
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
}

struct TransactionTableRowView_Previews: PreviewProvider {
    static var previews: some View {
      TransactionTableRowView(transaction: SampleData.createSampleWallet().transactions.first!)
    }
}
