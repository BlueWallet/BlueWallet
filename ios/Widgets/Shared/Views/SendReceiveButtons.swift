//
//  SendReceiveButtons.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/3/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI
import WidgetKit

struct SendReceiveButtons: View {
    var body: some View {
        VStack(alignment: .center) {
            HStack(alignment: .center, spacing: 16) {
                actionLink(title: String(localized: "receive"), action: "openReceive")
                actionLink(title: String(localized: "send"), action: "openSend")
            }
        }
    }

    private func actionLink(title: String, action: String) -> some View {
        Link(title, destination: URL(string: "bluewallet://widget?action=\(action)")!)
            .frame(minWidth: 144, maxWidth: .infinity, minHeight: 32, maxHeight: 32, alignment: .center)
            .lineLimit(1)
            .foregroundStyle(Color.textColor)
            .font(.system(size: 11, weight: .semibold))
            .background(Color.widgetBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 4.0)
                    .stroke(Color.widgetBackground, lineWidth: 4.0)
            )
    }
}

#Preview("Send Receive Buttons") {
    SendReceiveButtons()
        .previewContext(WidgetPreviewContext(family: .systemLarge))
}
