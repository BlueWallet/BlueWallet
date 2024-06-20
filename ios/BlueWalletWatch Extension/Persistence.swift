//
//  Persistence.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 6/19/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation
import CoreData

class PersistenceController {
    static let shared = PersistenceController()
    
    let container: NSPersistentContainer
    
    init() {
        container = NSPersistentContainer(name: "BlueWalletDataModel")
        container.loadPersistentStores { (storeDescription, error) in
            if let error = error as NSError? {
                fatalError("Unresolved error \(error), \(error.userInfo)")
            }
        }
    }
}

extension PersistenceController {
    static var preview: PersistenceController = {
        let controller = PersistenceController()
        let viewContext = controller.container.viewContext
        
        // Create sample data here if needed
        
        return controller
    }()
}
