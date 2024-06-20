import Foundation
import CoreData

@objc(Wallet)
public class Wallet: NSManagedObject, Identifiable, Codable {
    @NSManaged public var id: UUID
    @NSManaged public var label: String
    @NSManaged public var balance: String
    @NSManaged public var type: String
    @NSManaged public var preferredBalanceUnit: String
    @NSManaged public var receiveAddress: String
    @NSManaged public var transactions: NSSet?
    @NSManaged public var xpub: String?
    @NSManaged public var hideBalance: Bool
    @NSManaged public var paymentCode: String?

    public var transactionsArray: [Transaction] {
        let set = transactions as? Set<Transaction> ?? []
        return set.sorted { $0.time < $1.time }
    }
    
    enum CodingKeys: CodingKey {
        case id, label, balance, type, preferredBalanceUnit, receiveAddress, transactions, xpub, hideBalance, paymentCode
    }
    
    required convenience public init(from decoder: Decoder) throws {
        let context = PersistenceController.shared.container.viewContext
        let entity = NSEntityDescription.entity(forEntityName: "Wallet", in: context)!
        self.init(entity: entity, insertInto: context)
        
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        label = try container.decode(String.self, forKey: .label)
        balance = try container.decode(String.self, forKey: .balance)
        type = try container.decode(String.self, forKey: .type)
        preferredBalanceUnit = try container.decode(String.self, forKey: .preferredBalanceUnit)
        receiveAddress = try container.decode(String.self, forKey: .receiveAddress)
        transactions = NSSet(array: try container.decode([Transaction].self, forKey: .transactions))
        xpub = try container.decodeIfPresent(String.self, forKey: .xpub)
        hideBalance = try container.decode(Bool.self, forKey: .hideBalance)
        paymentCode = try container.decodeIfPresent(String.self, forKey: .paymentCode)
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(label, forKey: .label)
        try container.encode(balance, forKey: .balance)
        try container.encode(type, forKey: .type)
        try container.encode(preferredBalanceUnit, forKey: .preferredBalanceUnit)
        try container.encode(receiveAddress, forKey: .receiveAddress)
        try container.encode(transactionsArray, forKey: .transactions)
        try container.encodeIfPresent(xpub, forKey: .xpub)
        try container.encode(hideBalance, forKey: .hideBalance)
        try container.encodeIfPresent(paymentCode, forKey: .paymentCode)
    }

    func addTransaction(_ transaction: Transaction) {
        let items = self.mutableSetValue(forKey: "transactions")
        items.add(transaction)
    }
  
 
}

extension Wallet {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<Wallet> {
        return NSFetchRequest<Wallet>(entityName: "Wallet")
    }
  
  static func createMockWallet(context: NSManagedObjectContext) -> Wallet {
        let wallet = Wallet(context: context)
        wallet.id = UUID()
        wallet.label = "Sample Wallet"
        wallet.balance = "$1000"
        wallet.type = "HDsegwitP2SH"
        wallet.preferredBalanceUnit = "BTC"
        wallet.receiveAddress = "address"
        wallet.hideBalance = false
        wallet.paymentCode = nil

        // Add mock transactions if needed
        let transaction = Transaction(context: context)
        transaction.id = UUID()
        transaction.time = "Now"
        transaction.memo = "Sample Memo"
        transaction.amount = "100"
        transaction.type = "received"
        transaction.wallet = wallet
        wallet.transactions = [transaction] as NSSet

        return wallet
    }

}

