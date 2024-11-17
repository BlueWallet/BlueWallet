// Views/TransactionListRow.swift

import SwiftUI

struct TransactionListRow: View {
    let transaction: Transaction

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 5) {
                // Transaction memo or description
                Text(transaction.memo.isEmpty ? "No Description" : transaction.memo)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                // Transaction time
                Text(transaction.time)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Transaction amount
            Text(transaction.amount)
                .font(.headline)
                .foregroundColor(transaction.type == .received ? .green : .red)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.1))
        )
        .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
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
