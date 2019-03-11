//
//  InterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/6/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import WatchConnectivity
import Foundation


class InterfaceController: WKInterfaceController, WCSessionDelegate {
  
  private let keychain = KeychainSwift()
  var session: WCSession?
  private var wallets = [[String: Any]]();
  @IBOutlet weak var walletsTable: WKInterfaceTable!
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    if WCSession.isSupported() {
      print("Activating watch session")
      self.session = WCSession.default
      self.session?.delegate = self
      self.session?.activate()
      
      if let existingData = keychain.getData(WalletInformation.identifier), let walletData = try? NSKeyedUnarchiver.unarchiveTopLevelObjectWithData(existingData) as? [[String: Any]] {
        guard let walletData = walletData else { return }
        wallets = walletData
        processWalletsTable()
      }
    }
  }
  
  override func willActivate() {
    // This method is called when watch view controller is about to be visible to user
    super.willActivate()
    if (wallets.isEmpty) {
      session?.sendMessage(["message" : "sendApplicationContext"], replyHandler: nil, errorHandler: nil)
    }
  }
  
  override func didDeactivate() {
    // This method is called when watch view controller is no longer visible
    super.didDeactivate()
  }
  
  private func processWalletsTable() {
    walletsTable.setNumberOfRows(wallets.count, withRowType: WalletInformation.identifier)
    
    for index in 0..<walletsTable.numberOfRows {
      guard let controller = walletsTable.rowController(at: index) as? WalletInformation else { continue }
      
      if let name = wallets[index]["label"] as? String, let balance = wallets[index]["balance"] as? String, let type = wallets[index]["type"] as? String  {
        controller.name = name
        controller.balance = balance
        controller.type = type
        
      }
    }
    
  }
  
  private func processWalletsData(walletsInfo: [String: Any]) {
    if (!walletsInfo.isEmpty) {
      wallets.removeAll();
      wallets = walletsInfo["wallets"] as! [[String: Any]]
      if let walletsArchived = try? NSKeyedArchiver.archivedData(withRootObject: wallets, requiringSecureCoding: true) {
        keychain.set(walletsArchived, forKey: WalletInformation.identifier)
      }
      processWalletsTable()
    }
  }
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
    processWalletsData(walletsInfo: applicationContext)
  }
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
    processWalletsData(walletsInfo: applicationContext)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
    processWalletsData(walletsInfo: userInfo)
  }
  
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    // Not used
  }
    
    override func table(_ table: WKInterfaceTable, didSelectRowAt rowIndex: Int) {
        pushController(withName: WalletDetailsInterfaceController.identifier, context: wallets[rowIndex])
    }
  
}
