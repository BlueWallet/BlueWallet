//
//  BlueWalletApp.swift
//  BlueWalletWatchApp Extension
//
//  Created by Marcos Rodriguez on 11/5/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI

@main
struct BlueWalletApp: App {
    @SceneBuilder var body: some Scene {
        WindowGroup {
            NavigationView {
                ContentView()
            }
        }

        WKNotificationScene(controller: NotificationController.self, category: "myCategory")
    }
}

struct BlueWalletApp_Previews: PreviewProvider {
  static var previews: some View {
    /*@START_MENU_TOKEN@*/Text("Hello, World!")/*@END_MENU_TOKEN@*/
  }
}
