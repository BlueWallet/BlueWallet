// Simulator smoke tests. Compile together with PreviewViewController.swift;
// launch with --raw to leave the tested controller displaying its Raw view.
import UIKit

@main
final class PreviewSmokeTests: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: nil, sessionRole: session.role)
        configuration.delegateClass = PreviewSmokeScene.self
        return configuration
    }
}

final class PreviewSmokeScene: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let controller = PreviewViewController()
        window = UIWindow(windowScene: scene)
        window?.rootViewController = controller
        window?.makeKeyAndVisible()
        Task { @MainActor in
            do {
                let directory = FileManager.default.temporaryDirectory
                for ext in ["psbt", "txn"] {
                    let file = directory.appendingPathComponent("invalid.\(ext)")
                    try Data("invalid".utf8).write(to: file)
                    do {
                        try await controller.preparePreviewOfFile(at: file)
                        fatalError("Invalid \(ext) must fail preview preparation")
                    } catch {}
                }
                do {
                    try await controller.preparePreviewOfFile(at: directory.appendingPathComponent("missing.jsonl"))
                    fatalError("Missing file must fail preview preparation")
                } catch {}

                let file = directory.appendingPathComponent("sample.jsonl")
                let contents = """
                {"type":"tx","ref":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","label":"Coffee with Alice","height":0,"fee":10000,"value":-100000,"time":"2025-01-23T11:40:35Z"}
                {"type":"addr","ref":"bc1qsample","label":"Unused receive address","keypath":"/0/7"}
                {"type":"output","ref":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:0","label":"Reserved savings","spendable":false,"value":100000}
                invalid line
                """
                try Data(contents.utf8).write(to: file)
                try await controller.preparePreviewOfFile(at: file)
                let views = descendants(controller.view)
                guard let table = views.compactMap({ $0 as? UITableView }).first,
                      let toggle = views.compactMap({ $0 as? UISegmentedControl }).first,
                      let raw = views.compactMap({ $0 as? UITextView }).first else {
                    fatalError("Preview must expose native records and raw controls")
                }
                precondition(table.numberOfSections == 3)
                precondition((0..<3).allSatisfy { table.numberOfRows(inSection: $0) == 1 })
                let transactionCell = controller.tableView(table, cellForRowAt: IndexPath(row: 0, section: 0))
                let transactionContent = transactionCell.contentConfiguration as? UIListContentConfiguration
                precondition(transactionContent?.secondaryAttributedText?.string.contains("Height: 0") == true)
                let outputCell = controller.tableView(table, cellForRowAt: IndexPath(row: 0, section: 2))
                let outputContent = outputCell.contentConfiguration as? UIListContentConfiguration
                precondition(outputContent?.secondaryAttributedText?.string.contains("Spendable: No") == true)
                precondition(views.compactMap { ($0 as? UILabel)?.text }.contains { $0.contains("1 invalid line skipped") })
                toggle.selectedSegmentIndex = 1
                toggle.sendActions(for: .valueChanged)
                precondition(raw.text == contents)
                precondition(!raw.isHidden && table.isHidden)
                if !ProcessInfo.processInfo.arguments.contains("--raw") {
                    toggle.selectedSegmentIndex = 0
                    toggle.sendActions(for: .valueChanged)
                    precondition(!table.isHidden)
                }
                let result = "PASS: invalid PSBT/transaction, unreadable file, JSONL sections, soft parsing and Raw view\n"
                try Data(result.utf8).write(to: directory.appendingPathComponent("preview-smoke-results.txt"))
                FileHandle.standardOutput.write(Data(result.utf8))
            } catch {
                fatalError("Preview smoke test failed: \(error)")
            }
        }
    }

    private func descendants(_ view: UIView) -> [UIView] {
        [view] + view.subviews.flatMap(descendants)
    }
}
