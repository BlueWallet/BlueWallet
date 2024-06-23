import Foundation
struct SampleData {
    static func createSampleWallet() -> Wallet {
        let wallet = Wallet(
            id: UUID(),
            label: "Sample Wallet",
            balance: "$1000",
            type: WalletType.SegwitNative,
            preferredBalanceUnit: "BTC",
            receiveAddress: "address",
            xpub: "xpub...",
            hideBalance: false,
            paymentCode: nil
        )

        let transaction1 = WalletTransaction(
          id: UUID(),
            time: "12:00 PM",
            memo: "Sample Transaction 1",
            amount: "$100",
            type: "received",
            wallet: wallet
        )

        let transaction2 = WalletTransaction(
          id: UUID(),
            time: "01:00 PM",
            memo: "Sample Transaction 2",
            amount: "$200",
            type: "sent",
            wallet: wallet
        )

        wallet.transactions = [transaction1, transaction2]

        return wallet
    }
}
