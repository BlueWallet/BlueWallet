//
//  NotificationHostingController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 6/19/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//
import WatchKit
import SwiftUI

class NotificationHostingController: WKHostingController<NotificationView> {
    override var body: NotificationView {
        return NotificationView()
    }
}
