import SwiftUI

struct TransactionListRow: View {
    let transaction: Transaction

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                if !transaction.memo.isEmpty {
                    Text(transaction.memo)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                }
                
                Text(transactionTimeToReadable(transaction.time))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Text(Balance.formatBalance(Decimal(string: transaction.amount) ?? 0, toUnit: .btc))
                .font(.subheadline.bold())
                .foregroundColor(
                    transaction.type.isIncoming ? .green :
                    transaction.type.isOutgoing ? .red :
                    transaction.type.isPending ? .gray :
                    .primary
                )
        }
        .padding(.vertical, 4)
    }
    
    private func transactionTimeToReadable(_ time: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: time) else {
            return time
        }
        return RelativeDateTimeFormatter().localizedString(for: date, relativeTo: Date())
    }
}

struct TransactionListRow_Previews: PreviewProvider {
    static var previews: some View {
        TransactionListRow(transaction: Transaction(
            id: UUID(),
            time: "2024-11-16T14:30:00Z",
            memo: "Payment for coffee",
            type: .received,
            amount: "500000"
        ))
        .previewLayout(.sizeThatFits)
        .padding()
    }
}
