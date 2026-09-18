import UIKit

/// Mirrors WalletGradient.multisigHdWallet and MultipleStepsListItem.
enum VaultAppearance {
    static func color(_ hex: UInt32) -> UIColor {
        UIColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
    }
    static let gradient = [color(0x1ce6eb).cgColor, color(0x296fc5).cgColor, color(0x3500A2).cgColor]
    static let background = UIColor { $0.userInterfaceStyle == .dark ? color(0x121212) : .white }
    static let secondary = color(0x9aa0aa)
    static let panel = UIColor { $0.userInterfaceStyle == .dark ? color(0x262626) : color(0xf5f5f5) }
    static let success = UIColor { $0.userInterfaceStyle == .dark ? color(0x8EFFE5) : color(0x2FA380) }
    static let check = UIColor { $0.userInterfaceStyle == .dark ? .black : .white }
    static let artwork = UIImage(named: "vault-shape", in: Bundle(for: VaultPreviewView.self), compatibleWith: nil)

    static func label(_ text: String, size: CGFloat, weight: UIFont.Weight = .regular, color: UIColor = .label) -> UILabel {
        let label = UILabel()
        label.text = text
        label.textColor = color
        label.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: .systemFont(ofSize: size, weight: weight))
        label.adjustsFontForContentSizeCategory = true
        label.numberOfLines = 0
        return label
    }
}

final class VaultPreviewView: UIView, UISearchBarDelegate {
    private let setup: MultisigCoordination
    private let scrollView = UIScrollView()
    private let keys = UIStackView()
    private let searchBar = UISearchBar()
    private let resultsLabel = VaultAppearance.label("", size: 13, color: VaultAppearance.secondary)

    init(setup: MultisigCoordination) {
        self.setup = setup
        super.init(frame: .zero)
        backgroundColor = VaultAppearance.background
        searchBar.placeholder = "Search vault keys"
        searchBar.accessibilityIdentifier = "VaultKeySearch"
        searchBar.searchTextField.accessibilityHint = "Search by key number, fingerprint, derivation path, or public key."
        searchBar.searchBarStyle = .minimal
        searchBar.autocapitalizationType = .none
        searchBar.autocorrectionType = .no
        searchBar.searchTextField.smartQuotesType = .no
        searchBar.searchTextField.smartDashesType = .no
        searchBar.delegate = self
        searchBar.translatesAutoresizingMaskIntoConstraints = false
        scrollView.alwaysBounceVertical = true
        scrollView.keyboardDismissMode = .interactive
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(searchBar)
        addSubview(scrollView)
        NSLayoutConstraint.activate([
            searchBar.topAnchor.constraint(equalTo: topAnchor),
            searchBar.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            searchBar.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -8),
            scrollView.topAnchor.constraint(equalTo: searchBar.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: keyboardLayoutGuide.topAnchor),
        ])
        let content = UIStackView()
        content.axis = .vertical
        content.spacing = 24
        content.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(content)
        NSLayoutConstraint.activate([
            content.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor, constant: 20),
            content.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor, constant: -24),
            content.centerXAnchor.constraint(equalTo: scrollView.frameLayoutGuide.centerXAnchor),
            content.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor, constant: -32),
        ])
        content.addArrangedSubview(VaultCard(setup: setup))

        let policy = UIStackView(arrangedSubviews: [
            VaultAppearance.label("\(setup.required)", size: 15, weight: .semibold),
            VaultAppearance.label("signatures required to spend", size: 15, weight: .semibold, color: VaultAppearance.secondary),
        ])
        policy.spacing = 10
        policy.alignment = .center
        let badge = policy.arrangedSubviews[0] as! UILabel
        badge.textAlignment = .center
        badge.backgroundColor = VaultAppearance.panel
        badge.layer.cornerRadius = 6
        badge.clipsToBounds = true
        badge.widthAnchor.constraint(equalToConstant: UIFontMetrics.default.scaledValue(for: 30)).isActive = true
        badge.heightAnchor.constraint(greaterThanOrEqualToConstant: 28).isActive = true
        content.addArrangedSubview(policy)

        resultsLabel.accessibilityIdentifier = "VaultKeySearchResults"
        resultsLabel.isHidden = true
        content.addArrangedSubview(resultsLabel)
        keys.axis = .vertical
        keys.spacing = 0
        content.addArrangedSubview(keys)
        updateSearch()
        content.addArrangedSubview(VaultAppearance.label("Public keys only · Coordination setup", size: 13, color: VaultAppearance.secondary))
    }

    private func updateSearch() {
        let query = searchBar.text ?? ""
        let indices = setup.matchingCosignerIndices(query: query)
        for row in keys.arrangedSubviews { row.removeFromSuperview() }
        for (position, index) in indices.enumerated() {
            keys.addArrangedSubview(VaultKeyView(index: index, cosigner: setup.cosigners[index], last: position == indices.count - 1))
        }
        resultsLabel.isHidden = query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        resultsLabel.text = indices.isEmpty ? "No matching keys" : "\(indices.count) of \(setup.total) keys"
        if !resultsLabel.isHidden {
            layoutIfNeeded()
            let resultTop = resultsLabel.convert(resultsLabel.bounds, to: scrollView).minY
            let maximumOffset = max(0, scrollView.contentSize.height - scrollView.bounds.height)
            scrollView.setContentOffset(CGPoint(x: 0, y: min(resultTop, maximumOffset)), animated: false)
        }
    }

    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        updateSearch()
    }

    func searchBarTextDidBeginEditing(_ searchBar: UISearchBar) {
        searchBar.setShowsCancelButton(true, animated: true)
    }

    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }

    func searchBarCancelButtonClicked(_ searchBar: UISearchBar) {
        searchBar.text = ""
        searchBar.resignFirstResponder()
        searchBar.setShowsCancelButton(false, animated: true)
        updateSearch()
        scrollView.setContentOffset(.zero, animated: true)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}

private final class VaultCard: UIView {
    private let gradient = CAGradientLayer()
    init(setup: MultisigCoordination) {
        super.init(frame: .zero)
        layer.cornerRadius = 12
        clipsToBounds = true
        gradient.colors = VaultAppearance.gradient
        gradient.startPoint = CGPoint(x: 0.5, y: 0)
        gradient.endPoint = CGPoint(x: 0.5, y: 1)
        layer.addSublayer(gradient)
        let art = UIImageView(image: VaultAppearance.artwork)
        art.contentMode = .scaleAspectFill
        art.alpha = 0.12
        art.setContentCompressionResistancePriority(.fittingSizeLevel, for: .vertical)
        art.setContentHuggingPriority(.fittingSizeLevel, for: .vertical)
        art.translatesAutoresizingMaskIntoConstraints = false
        addSubview(art)
        let labels = UIStackView(arrangedSubviews: [
            VaultAppearance.label(setup.name, size: 20, weight: .semibold, color: .white),
            VaultAppearance.label(setup.policy, size: 34, weight: .bold, color: .white),
            VaultAppearance.label("Multisig Vault · \(setup.format)", size: 14, color: .white),
        ])
        labels.axis = .vertical
        labels.spacing = 16
        labels.translatesAutoresizingMaskIntoConstraints = false
        addSubview(labels)
        NSLayoutConstraint.activate([
            labels.topAnchor.constraint(equalTo: topAnchor, constant: 20),
            labels.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -20),
            labels.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 20),
            labels.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20),
            art.trailingAnchor.constraint(equalTo: trailingAnchor),
            art.topAnchor.constraint(equalTo: topAnchor),
            art.bottomAnchor.constraint(equalTo: bottomAnchor),
            art.widthAnchor.constraint(equalTo: widthAnchor, multiplier: 0.65),
        ])
    }
    override func layoutSubviews() { super.layoutSubviews(); gradient.frame = bounds }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}

private final class VaultKeyView: UIView {
    private let connector = CAShapeLayer()
    private let last: Bool
    private let panel = UIStackView()
    init(index: Int, cosigner: MultisigCoordination.Cosigner, last: Bool) {
        self.last = last
        super.init(frame: .zero)
        layer.addSublayer(connector)
        connector.lineDashPattern = [3, 3]
        connector.strokeColor = VaultAppearance.color(0xc4c4c4).cgColor
        connector.lineWidth = 1

        let circle = UIView()
        circle.backgroundColor = VaultAppearance.success
        circle.layer.cornerRadius = 21
        let check = UIImageView(image: UIImage(systemName: "checkmark", withConfiguration: UIImage.SymbolConfiguration(pointSize: 24, weight: .medium)))
        check.tintColor = VaultAppearance.check
        check.contentMode = .center
        check.translatesAutoresizingMaskIntoConstraints = false
        circle.addSubview(check)
        let title = VaultAppearance.label("Vault key \(index + 1)", size: 18, weight: .bold, color: VaultAppearance.secondary)
        panel.axis = .vertical
        panel.spacing = 10
        panel.isLayoutMarginsRelativeArrangement = true
        panel.layoutMargins = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)
        panel.layer.cornerRadius = 8
        panel.layer.borderWidth = 1
        panel.backgroundColor = VaultAppearance.background
        panel.addArrangedSubview(VaultAppearance.label(cosigner.fingerprint, size: 15, weight: .semibold))
        if let path = cosigner.derivation {
            panel.addArrangedSubview(VaultAppearance.label(path, size: 13, color: VaultAppearance.secondary))
        }
        let key = VaultPublicKeyView(publicKey: cosigner.key, index: index)
        key.font = UIFontMetrics(forTextStyle: .footnote).scaledFont(for: .monospacedSystemFont(ofSize: 13, weight: .regular))
        key.adjustsFontForContentSizeCategory = true
        key.textColor = .label
        key.backgroundColor = .clear
        key.isEditable = false
        key.isScrollEnabled = false
        key.textContainerInset = .zero
        key.textContainer.lineFragmentPadding = 0
        key.textContainer.lineBreakMode = .byCharWrapping
        panel.addArrangedSubview(key)
        for child in [circle, title, panel] {
            child.translatesAutoresizingMaskIntoConstraints = false
            addSubview(child)
        }
        NSLayoutConstraint.activate([
            circle.leadingAnchor.constraint(equalTo: leadingAnchor),
            circle.topAnchor.constraint(equalTo: topAnchor),
            circle.widthAnchor.constraint(equalToConstant: 42),
            circle.heightAnchor.constraint(equalToConstant: 42),
            check.centerXAnchor.constraint(equalTo: circle.centerXAnchor),
            check.centerYAnchor.constraint(equalTo: circle.centerYAnchor),
            title.leadingAnchor.constraint(equalTo: circle.trailingAnchor, constant: 16),
            title.trailingAnchor.constraint(equalTo: trailingAnchor),
            title.topAnchor.constraint(equalTo: topAnchor, constant: 9),
            panel.topAnchor.constraint(greaterThanOrEqualTo: circle.bottomAnchor, constant: 16),
            panel.topAnchor.constraint(greaterThanOrEqualTo: title.bottomAnchor, constant: 16),
            panel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 40),
            panel.trailingAnchor.constraint(equalTo: trailingAnchor),
            panel.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -24),
        ])
        let preferredTop = panel.topAnchor.constraint(equalTo: circle.bottomAnchor, constant: 16)
        preferredTop.priority = .defaultHigh
        preferredTop.isActive = true
        panel.layer.borderColor = VaultAppearance.panel.resolvedColor(with: traitCollection).cgColor
    }
    override func layoutSubviews() {
        super.layoutSubviews()
        panel.layer.borderColor = VaultAppearance.panel.resolvedColor(with: traitCollection).cgColor
        let path = UIBezierPath()
        path.move(to: CGPoint(x: 21, y: 42))
        path.addLine(to: CGPoint(x: 21, y: last ? bounds.height - 24 : bounds.height))
        connector.path = path.cgPath
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}

/// Copies the whole extended public key, without requiring text selection across lines.
private final class VaultPublicKeyView: UITextView, UIContextMenuInteractionDelegate {
    private let publicKey: String

    init(publicKey: String, index: Int) {
        self.publicKey = publicKey
        super.init(frame: .zero, textContainer: nil)
        text = publicKey
        isEditable = false
        isSelectable = false
        accessibilityIdentifier = "VaultPublicKey-\(index + 1)"
        accessibilityLabel = "Vault key \(index + 1) public key"
        accessibilityValue = publicKey
        accessibilityHint = "Touch and hold to copy the full public key."
        accessibilityCustomActions = [
            UIAccessibilityCustomAction(name: "Copy public key", target: self, selector: #selector(copyPublicKey)),
        ]
        addInteraction(UIContextMenuInteraction(delegate: self))
    }

    func contextMenuInteraction(_ interaction: UIContextMenuInteraction,
                                configurationForMenuAtLocation location: CGPoint) -> UIContextMenuConfiguration? {
        UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { [weak self] _ in
            UIMenu(children: [
                UIAction(title: "Copy public key", image: UIImage(systemName: "doc.on.doc")) { [weak self] _ in
                    _ = self?.copyPublicKey()
                },
            ])
        }
    }

    @objc private func copyPublicKey() -> Bool {
        UIPasteboard.general.string = publicKey
        return true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}
