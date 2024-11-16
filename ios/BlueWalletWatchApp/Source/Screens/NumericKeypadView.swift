//
//  NumericKeypadView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/16/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


// Views/NumericKeypadView.swift

import SwiftUI

struct NumericKeypadView: View {
    @Binding var amount: String
    @Binding var isCreateEnabled: Bool
    
    let buttons = [
        ["1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9"],
        [".", "0", "<"]
    ]
    
    var body: some View {
        VStack {
            Text(amount.isEmpty ? "0" : amount)
                .font(.largeTitle)
                .padding()
            
            ForEach(buttons, id: \.self) { row in
                HStack(spacing: 10) {
                    ForEach(row, id: \.self) { button in
                        Button(action: {
                            buttonTapped(button)
                        }) {
                            Text(button)
                                .font(.title)
                                .frame(width: 50, height: 50)
                                .background(Color.gray.opacity(0.3))
                                .cornerRadius(8)
                        }
                    }
                }
                .padding(.horizontal)
            }
            
            Spacer()
        }
        .navigationTitle("Enter Amount")
    }
    
    func buttonTapped(_ button: String) {
        if button == "<" {
            if !amount.isEmpty {
                amount.removeLast()
            }
        } else {
            amount += button
        }
        isCreateEnabled = !amount.isEmpty && Double(amount) != nil
    }
}

struct NumericKeypadView_Previews: PreviewProvider {
    static var previews: some View {
        NumericKeypadView(amount: .constant(""), isCreateEnabled: .constant(false))
    }
}