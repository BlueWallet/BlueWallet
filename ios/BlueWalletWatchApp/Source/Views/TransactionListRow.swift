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
                
                // Use the `time` property to format the date
                Text(formattedDate())
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .opacity(transaction.time > 0 ? 1 : 0)  // Hide if no time value
                
                Text(Balance.formatBalance(transaction.amount, toUnit: .btc))
                    .font(.subheadline.bold())
                    .foregroundColor(
                        transaction.type.isIncoming ? .green :
                        transaction.type.isOutgoing ? .red :
                        transaction.type.isPending ? .gray :
                        .primary
                    )
            }
        }
    }
    
    // Helper method to format the `time` property using RelativeDateTimeFormatter
    private func formattedDate() -> String {
        let transactionDate = Date(timeIntervalSince1970: TimeInterval(transaction.time))
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        let relativeDate = formatter.localizedString(for: transactionDate, relativeTo: Date())
        return relativeDate
    }
}

struct TransactionListRow_Previews: PreviewProvider {
    static var previews: some View {
        TransactionListRow(transaction: Transaction(
            id: UUID(),
            time: Int(Date().timeIntervalSince1970) - 300,  // 5 minutes ago
            memo: "Payment for coffee",
            type: .received,
            amount: 500000
        ))
        .previewLayout(.sizeThatFits)
        .padding()
    }
}
