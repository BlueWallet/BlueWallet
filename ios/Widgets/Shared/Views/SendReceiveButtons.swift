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
    private let fallbackReceiveURL = "bluewallet://widget?action=openReceive"
    private let fallbackSendURL = "bluewallet://widget?action=openSend"

    private func destinationURL(for key: UserDefaultsGroupKey, fallback: String) -> URL {
        let sharedDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
        let configuredURL = sharedDefaults?.string(forKey: key.rawValue)
        let resolvedURL = (configuredURL?.isEmpty == false ? configuredURL : nil) ?? fallback
        return URL(string: resolvedURL)!
    }

    var body: some View {
      VStack(alignment: .center, spacing: nil, content: {
        HStack(alignment: /*@START_MENU_TOKEN@*/.center/*@END_MENU_TOKEN@*/, spacing: 16, content: {
          Link("receive", destination: destinationURL(for: .WidgetOpenReceiveURL, fallback: fallbackReceiveURL)).frame(minWidth: 144, maxWidth: /*@START_MENU_TOKEN@*/.infinity/*@END_MENU_TOKEN@*/, minHeight: 32, maxHeight: 32, alignment: /*@START_MENU_TOKEN@*/.center/*@END_MENU_TOKEN@*/).lineLimit(1).foregroundColor(.textColor).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color.widgetBackground).overlay(
            RoundedRectangle(cornerRadius: 4.0)
              .stroke(Color.widgetBackground, lineWidth: 4.0))
          Link("send", destination: destinationURL(for: .WidgetOpenSendURL, fallback: fallbackSendURL)).frame(minWidth: 144, maxWidth: /*@START_MENU_TOKEN@*/.infinity/*@END_MENU_TOKEN@*/, minHeight: 32, maxHeight: 32, alignment: /*@START_MENU_TOKEN@*/.center/*@END_MENU_TOKEN@*/).lineLimit(1).foregroundColor(.textColor).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color.widgetBackground).overlay(
            RoundedRectangle(cornerRadius: 4.0)
              .stroke(Color.widgetBackground, lineWidth: 4.0))
        })
      })
    }
}

struct SendReceiveButtons_Previews: PreviewProvider {
    static var previews: some View {
        SendReceiveButtons().previewContext(WidgetPreviewContext(family: .systemLarge))
    }
}
