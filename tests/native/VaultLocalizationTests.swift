import Foundation

// Run inside a macOS test app bundle containing the compiled VaultPreview.strings
// resources. See README.md for bundle setup and AppleLanguages arguments.
@main
enum VaultLocalizationTests {
    static func main() throws {
        let latinAmerican = CommandLine.arguments.contains("--latin-american")
        let spanish = CommandLine.arguments.contains("--spanish") || latinAmerican
        let expectedSearch = latinAmerican ? "Buscar claves de la bóveda" : (spanish ? "Buscar claves de la Vault" : "Search vault keys")
        let expectedKey = latinAmerican ? "Clave de la Bóveda 2" : (spanish ? "Clave de la Vault 2" : "Vault key 2")
        precondition(VaultLocalization.text("Search vault keys") == expectedSearch)
        precondition(VaultLocalization.key(2) == expectedKey)
        precondition(VaultLocalization.policy(required: 2, total: 3) == (spanish ? "2 de 3" : "2 of 3"))
        precondition(VaultLocalization.policy(required: 2, total: 3, compact: true) == "2/3")
        precondition(VaultLocalization.text("Copy public key") == (spanish ? "Copiar clave pública" : "Copy public key"))
        precondition(VaultLocalization.format("Keys: %1$@ / %2$@", "1", "3") == (spanish ? "Claves: 1 / 3" : "Keys: 1 / 3"))
        precondition(VaultLocalization.text("Search labels") == (spanish ? "Buscar etiquetas" : "Search labels"))
        precondition(VaultLocalization.text("Copy fingerprint") == (spanish ? "Copiar huella digital" : "Copy fingerprint"))
        precondition(VaultLocalization.format("Signature data: %1$@ / %2$@ inputs", "1", "3") == (spanish ? "Datos de firma: 1 / 3 entradas" : "Signature data: 1 / 3 inputs"))
        precondition(VaultLocalization.text("Preview unavailable") == (spanish ? "Vista previa no disponible" : "Preview unavailable"))
        let setup = try MultisigCoordination.parse(file: URL(fileURLWithPath: "tests/unit/fixtures/quicklook-preview-sample.bwcoord"))
        precondition(setup.matchingCosignerIndices(query: expectedKey.lowercased()) == [1])
        precondition(setup.name == "Family Vault (Sample)")
        precondition(setup.cosigners[0].fingerprint == "168DD603")
        precondition(setup.cosigners[0].derivation == "m/48'/0'/0'/2'")
        precondition(setup.cosigners[0].key.hasPrefix("Zpub"))
        print("Localization, placeholders, localized search, and unchanged file data checks passed")
    }
}
