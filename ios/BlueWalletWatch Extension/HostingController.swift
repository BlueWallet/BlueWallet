//
//  HostingController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 6/19/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import WatchKit
import Foundation
import SwiftUI

class HostingController: WKHostingController<WalletsListView> {
    override var body: WalletsListView {
      WalletsListView()
    }
}
