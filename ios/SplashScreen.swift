//
//  SplashScreen.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 1/24/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation
import React

@objc(SplashScreen)
class SplashScreen: NSObject, RCTBridgeModule {
  static func moduleName() -> String! {
    return "SplashScreen"
  }
  
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc
  func addObserver() {
    NotificationCenter.default.addObserver(self, selector: #selector(dismissSplashScreen), name: NSNotification.Name("HideSplashScreen"), object: nil)
  }

  @objc 
  func dismissSplashScreen() {
    DispatchQueue.main.async {
      if let rootView = UIApplication.shared.delegate?.window??.rootViewController?.view as? RCTRootView {
        rootView.loadingView?.removeFromSuperview()
        rootView.loadingView = nil
      }
      NotificationCenter.default.removeObserver(self, name: NSNotification.Name("HideSplashScreen"), object: nil)
    }
  }
  
  
}
