import Foundation

struct SampleData {
  static func createSampleWallet(ofType type: WalletType = .SegwitNative) -> Wallet {
        let wallet = Wallet(
            id: UUID(),
            label: "\(type.rawValue) Wallet",
            balance: "$1000",
            type: type,
            preferredBalanceUnit: "BTC",
            receiveAddress: "addressaddressaddressaddressaddressaddressaddressaddressaddressaddressaddressaddressaddressaddressaddressaddressaddressaddress",
            xpub: "xpub...xpub...xpub...xpub...xpub...xpub...xpub...xpub...xpub...xpub...xpub...xpub...xpub...xpub...",
            hideBalance: type == .LightningCustodial,
            paymentCode: nil
        )

        let transaction1 = WalletTransaction(
            id: UUID(),
            time: "12:00 PM",
            memo: "Sample Transaction 1",
            amount: "$100",
            type: .Received,
            wallet: wallet
        )

        let transaction2 = WalletTransaction(
            id: UUID(),
            time: "01:00 PM",
            memo: "Sample Transaction 2",
            amount: "$200",
            type: .Sent,
            wallet: wallet
        )

        wallet.transactions = [transaction1, transaction2]

        return wallet
    }
    
    static func createAllSampleWallets() -> [Wallet] {
        return WalletType.allCases.map { createSampleWallet(ofType: $0) }
    }
}
