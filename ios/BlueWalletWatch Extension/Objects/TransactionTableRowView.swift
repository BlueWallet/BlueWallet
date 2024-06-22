//
//  TransactionTableRow.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/10/19.

//
import SwiftUI

struct TransactionTableRowView: View {
    var transaction: WalletTransaction

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(transaction.amount ?? "")
                Text(transaction.memo ?? "")
                Text(transaction.time ?? "")
                    .foregroundColor(transaction.type == "pendingConfirmation" ? .orange : .primary)
            }
            Spacer()
            Image(systemName: icon(for: transaction.type ?? ""))
        }
    }

    private func icon(for type: String) -> String {
        switch type {
        case "pendingConfirmation":
            return "clock"
        case "received":
            return "arrow.down.circle"
        case "sent":
            return "arrow.up.circle"
        default:
            return "questionmark.circle"
        }
    }
}

struct TransactionTableRowView_Previews: PreviewProvider {
    static var previews: some View {
        let mockTransaction = WalletTransaction(
            id: UUID(),
            time: "12:00 PM",
            memo: "Sample Transaction",
            amount: "$100",
            type: "received"
        )
        return TransactionTableRowView(transaction: mockTransaction)
    }
}
