//
//  InterfaceController.swift
//  BlueWalletWatch Extension
//

import WatchKit
import Foundation

class InterfaceController: WKInterfaceController {

    @IBOutlet weak var walletsTable: WKInterfaceTable!
    @IBOutlet weak var noWalletsAvailableLabel: WKInterfaceLabel!
    
    // MARK: - Lifecycle Methods
    
    override func willActivate() {
        super.willActivate()
        updateUI()
        NotificationCenter.default.addObserver(self, selector: #selector(updateUI), name: WatchDataSource.NotificationName.dataUpdated, object: nil)
        print("InterfaceController will activate.")
    }
    
    override func didDeactivate() {
        super.didDeactivate()
        NotificationCenter.default.removeObserver(self, name: WatchDataSource.NotificationName.dataUpdated, object: nil)
        print("InterfaceController did deactivate.")
    }
    
    // MARK: - UI Update Methods
    
    @objc private func updateUI() {
        let wallets = WatchDataSource.shared.wallets
        let isEmpty = wallets.isEmpty
        noWalletsAvailableLabel.setHidden(!isEmpty)
        walletsTable.setHidden(isEmpty)
        
        if isEmpty {
            print("No wallets available to display.")
            return
        }
        
        walletsTable.setNumberOfRows(wallets.count, withRowType: WalletInformation.identifier)
        for index in 0..<wallets.count {
            updateRow(at: index, with: wallets[index])
        }
        print("Updated UI with \(wallets.count) wallets.")
    }
    
    private func updateRow(at index: Int, with wallet: Wallet) {
        guard let controller = walletsTable.rowController(at: index) as? WalletInformation else {
            print("Failed to retrieve row controller for index \(index).")
            return
        }
        controller.configure(with: wallet)
        print("Configured row \(index) with wallet: \(wallet.label).")
    }
    
  
    
    // MARK: - Segue Handling
    
    override func contextForSegue(withIdentifier segueIdentifier: String, in table: WKInterfaceTable, rowIndex: Int) -> Any? {
        print("Preparing segue with identifier \(segueIdentifier) for row \(rowIndex).")
        return rowIndex
    }
}
