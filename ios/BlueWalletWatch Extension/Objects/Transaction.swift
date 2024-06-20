//
//  Wallet.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/13/19.

//
import Foundation
import CoreData

@objc(Transaction)
public class Transaction: NSManagedObject, Identifiable, Codable {
    @NSManaged public var id: UUID
    @NSManaged public var time: String
    @NSManaged public var memo: String
    @NSManaged public var amount: String
    @NSManaged public var type: String
    @NSManaged public var wallet: Wallet?

    enum CodingKeys: CodingKey {
        case id, time, memo, amount, type, wallet
    }
    
    required convenience public init(from decoder: Decoder) throws {
        let context = PersistenceController.shared.container.viewContext
        let entity = NSEntityDescription.entity(forEntityName: "Transaction", in: context)!
        self.init(entity: entity, insertInto: context)
        
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        time = try container.decode(String.self, forKey: .time)
        memo = try container.decode(String.self, forKey: .memo)
        amount = try container.decode(String.self, forKey: .amount)
        type = try container.decode(String.self, forKey: .type)
        wallet = try container.decodeIfPresent(Wallet.self, forKey: .wallet)
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(time, forKey: .time)
        try container.encode(memo, forKey: .memo)
        try container.encode(amount, forKey: .amount)
        try container.encode(type, forKey: .type)
        try container.encodeIfPresent(wallet, forKey: .wallet)
    }
}

extension Transaction {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<Transaction> {
        return NSFetchRequest<Transaction>(entityName: "Transaction")
    }
}
