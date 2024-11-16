//
//  TransactionRowView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/16/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


// Views/TransactionRowView.swift

import SwiftUI

struct TransactionRowView: View {
    var transaction: Transaction
    
    var body: some View {
        HStack {
          Image(transaction.type == .pending ? .pendingConfirmation : .receivedArrow)
                .resizable()
                .frame(width: 23, height: 16)
            VStack(alignment: .leading, spacing: 4) {
                Text(transaction.time)
                    .font(.subheadline)
                Text(transaction.memo)
                    .font(.subheadline)
                    .foregroundColor(Color(red: 0.63, green: 0.63, blue: 0.63).opacity(0.85))
                Text("Amount: \(transaction.amount)")
                    .font(.subheadline)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

struct TransactionRowView_Previews: PreviewProvider {
    static var previews: some View {
      TransactionRowView(transaction: Transaction(time: "2023-10-10 10:00", memo: "Payment for services", type: .received, amount: "0.1 BTC"))
            .previewLayout(.sizeThatFits)
    }
}
