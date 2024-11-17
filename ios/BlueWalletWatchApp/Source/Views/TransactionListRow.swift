// Views/TransactionListRow.swift

import SwiftUI

struct TransactionListRow: View {
    let transaction: Transaction

    var body: some View {
        HStack(spacing: 12) { // Adjust spacing between elements
            VStack(alignment: .leading, spacing: 2) { // Reduced vertical spacing in the text
              if (!transaction.memo.isEmpty) {
                Text(transaction.memo)
                    .font(.subheadline) // Slightly smaller font
                    .foregroundColor(.primary)
              }
               
                Text(transaction.time)
                    .font(.caption) // Use caption for the secondary text
                    .foregroundColor(.secondary)
            }

            Spacer()

            Text(transaction.amount)
                .font(.subheadline.bold()) // Smaller bold font
                .foregroundColor(
                    transaction.type.isIncoming ? .green :
                    transaction.type.isOutgoing ? .red :
                    transaction.type.isPending ? .gray :
                    .primary
                )
        }
        .padding(.vertical, 4) // Reduced padding for compact height
    }
}
struct TransactionListRow_Previews: PreviewProvider {
    static var previews: some View {
        TransactionListRow(transaction: Transaction(
            id: UUID(),
            time: "2024-11-16 14:30",
            memo: "Payment for coffee",
            type: .received,
            amount: "0.005 BTC"
        ))
        .previewLayout(.sizeThatFits)
        .padding()
    }
}
