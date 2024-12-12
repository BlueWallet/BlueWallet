import Foundation

/// Represents a wallet with various properties including its type.
/// Conforms to `Codable` and `Identifiable` for encoding/decoding and unique identification.
struct Wallet: Codable, Identifiable, Equatable {
    let id: UUID
    let label: String
    let balance: String
    let type: WalletType
    let chain: Chain
  let preferredBalanceUnit:  BitcoinUnit
    let receiveAddress: String
    let transactions: [Transaction]
    let xpub: String
    let hideBalance: Bool
    let paymentCode: String?
        
    /// Initializes a new Wallet instance.
    /// - Parameters:
    ///   - id: Unique identifier for the wallet. Defaults to a new UUID.
    ///   - label: Display label for the wallet.
    ///   - balance: Current balance of the wallet as a string.
    ///   - type: The type of the wallet, defined by `WalletType`.
    ///   - preferredBalanceUnit: The preferred unit for displaying balance (e.g., BTC).
    ///   - receiveAddress: The address to receive funds.
    ///   - transactions: An array of transactions associated with the wallet.
    ///   - xpub: Extended public key for HD wallets.
    ///   - hideBalance: Indicates whether the balance should be hidden.
    ///   - paymentCode: Optional payment code associated with the wallet.
  init(id: UUID = UUID(), label: String, balance: String, type: WalletType, chain: Chain = .onchain, preferredBalanceUnit: BitcoinUnit = .sats, receiveAddress: String, transactions: [Transaction], xpub: String, hideBalance: Bool, paymentCode: String? = nil) {
        self.id = id
        self.label = label
        self.balance = balance
        self.type = type
      self.chain = chain
        self.preferredBalanceUnit = preferredBalanceUnit
        self.receiveAddress = receiveAddress
        self.transactions = transactions
        self.xpub = xpub
        self.hideBalance = hideBalance
        self.paymentCode = paymentCode
    }
}

extension Wallet {
    static var mock: Wallet {
        Wallet(
            label: "Mock Wallet",
            balance: "1.2345 BTC",
            type: .hdSegwitBech32Wallet,
            preferredBalanceUnit: .sats,
            receiveAddress: "bc1qmockaddressxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            transactions: Transaction.mockTransactions, // Includes multiple transactions
            xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKp...",
            hideBalance: false,
            paymentCode: "p2pkh_mock_payment_code"
        )
    }
}

extension Wallet {
    var formattedBalance: String {
        guard let balanceDecimal = Decimal(string: balance) else { return balance }
        return balanceDecimal.formatted(as: preferredBalanceUnit)
    }
}
