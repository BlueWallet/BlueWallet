import QuickLookThumbnailing
import UIKit

final class ThumbnailProvider: QLThumbnailProvider {
    override func provideThumbnail(for request: QLFileThumbnailRequest, _ handler: @escaping (QLThumbnailReply?, Error?) -> Void) {
        if request.fileURL.pathExtension.lowercased() == "bwcoord" {
            do {
                let setup = try MultisigCoordination.parse(file: request.fileURL)
                let size = request.maximumSize
                handler(QLThumbnailReply(contextSize: size, currentContextDrawing: {
                    VaultThumbnail.draw(setup: setup, size: size)
                }), nil)
            } catch {
                handler(nil, error)
            }
            return
        }
        do {
            let document = try QuickLookDocument.read(file: request.fileURL)
            handler(QLThumbnailReply(contextSize: request.maximumSize, currentContextDrawing: {
                DocumentThumbnail.draw(document: document, size: request.maximumSize)
            }), nil)
        } catch {
            handler(nil, error)
        }
    }
}

/// Large figures remain legible in Files grid and list sizes.
enum DocumentThumbnail {
    static func draw(document: QuickLookDocument, size: CGSize) -> Bool {
        guard let context = UIGraphicsGetCurrentContext(), size.width > 0, size.height > 0 else { return false }
        let bounds = CGRect(origin: .zero, size: size)
        let edge = min(size.width, size.height)
        let compact = edge < 72
        let inset = max(3, edge * 0.07)
        let width = size.width - 2 * inset
        context.saveGState()
        defer { context.restoreGState() }
        UIBezierPath(roundedRect: bounds, cornerRadius: edge * 0.06).addClip()
        UIColor.white.setFill(); UIBezierPath(rect: bounds).fill()
        VaultAppearance.color(0x0c2550).setFill()
        let headerHeight = size.height * (compact ? 0.65 : 0.36)
        UIBezierPath(rect: CGRect(x: 0, y: 0, width: size.width, height: headerHeight)).fill()
        let paragraph = NSMutableParagraphStyle(); paragraph.alignment = .center
        paragraph.lineBreakMode = .byTruncatingTail
        func line(_ text: String, y: CGFloat, height: CGFloat, fontSize: CGFloat, color: UIColor) {
            var font = UIFont.systemFont(ofSize: fontSize, weight: .bold)
            let measured = (text as NSString).size(withAttributes: [.font: font]).width
            if measured > width { font = .systemFont(ofSize: max(fontSize * 0.6, fontSize * width / measured * 0.94), weight: .bold) }
            (text as NSString).draw(with: CGRect(x: inset, y: y + max(0, (height - font.lineHeight) / 2), width: width, height: height), options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], attributes: [.font: font, .foregroundColor: color, .paragraphStyle: paragraph], context: nil)
        }
        let value = document.kind == .labels ? QuickLookDocument.compactAmount(UInt64(document.records.count)) : document.total.map { edge < 200 ? QuickLookDocument.compactAmount($0) : NumberFormatter.localizedString(from: NSNumber(value: $0), number: .decimal) } ?? "—"
        line(value, y: 0, height: headerHeight, fontSize: min(36, edge * 0.26), color: .white)
        let unit = VaultLocalization.text(document.kind == .labels ? "Labels" : "sats")
        line(unit, y: headerHeight, height: compact ? size.height - headerHeight : edge * 0.20, fontSize: max(7, min(16, edge * 0.13)), color: VaultAppearance.color(0x0c2550))
        if !compact {
            line(document.kind == .transaction ? VaultLocalization.text("Transaction") : document.title, y: headerHeight + edge * 0.20, height: edge * 0.20, fontSize: min(18, edge * 0.12), color: VaultAppearance.color(0x0c2550))
            if document.kind == .psbt && edge >= 200 {
                line(VaultLocalization.format("Signature data: %1$@/%2$@", VaultLocalization.number(document.signedInputs), VaultLocalization.number(document.inputCount)), y: size.height * 0.79, height: size.height * 0.18, fontSize: min(14, edge * 0.095), color: VaultAppearance.color(0x475569))
            } else if document.kind != .labels {
                line(VaultLocalization.format("Outputs: %@", VaultLocalization.number(document.outputCount)), y: size.height * 0.79, height: size.height * 0.18, fontSize: min(14, edge * 0.09), color: VaultAppearance.color(0x475569))
            }
        }
        return true
    }
}

/// Uses the same renderer for Files thumbnails and native layout checks.
enum VaultThumbnail {
    static func draw(setup: MultisigCoordination, size: CGSize) -> Bool {
        guard size.width > 0, size.height > 0, let context = UIGraphicsGetCurrentContext(),
              let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                                        colors: VaultAppearance.gradient as CFArray, locations: nil) else { return false }
        let bounds = CGRect(origin: .zero, size: size)
        let edge = min(size.width, size.height)
        let compact = edge < 72
        let inset = max(3, edge * 0.07)
        let width = size.width - inset * 2
        let headerHeight = size.height * (compact ? 1 : 0.36)
        context.saveGState()
        defer { context.restoreGState() }
        UIBezierPath(roundedRect: bounds, cornerRadius: edge * 0.05).addClip()
        UIColor.white.setFill()
        UIBezierPath(rect: bounds).fill()
        context.saveGState()
        context.clip(to: CGRect(x: 0, y: 0, width: size.width, height: headerHeight))
        context.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: size.width, y: headerHeight), options: [])
        VaultAppearance.artwork?.draw(in: CGRect(x: size.width * 0.45, y: 0, width: size.width * 0.7, height: headerHeight),
                                     blendMode: .normal, alpha: 0.12)
        UIColor.black.withAlphaComponent(0.45).setFill()
        UIBezierPath(rect: bounds).fill()
        context.restoreGState()

        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        paragraph.lineBreakMode = .byTruncatingTail
        func draw(_ text: String, in rect: CGRect, font: UIFont, color: UIColor) {
            (text as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine],
                                   attributes: [.font: font, .foregroundColor: color, .paragraphStyle: paragraph], context: nil)
        }
        let policy = VaultLocalization.policy(required: setup.required, total: setup.total, compact: compact)
        var policyFont = UIFont.systemFont(ofSize: min(48, edge * (compact ? 0.40 : 0.29)), weight: .heavy)
        let policyWidth = (policy as NSString).size(withAttributes: [.font: policyFont]).width
        if policyWidth > width {
            policyFont = .systemFont(ofSize: policyFont.pointSize * width / policyWidth, weight: .heavy)
        }
        draw(policy, in: CGRect(x: inset, y: (headerHeight - policyFont.lineHeight) / 2, width: width, height: policyFont.lineHeight),
             font: policyFont, color: .white)

        let ink = VaultAppearance.color(0x0c2550)
        if compact { return true }

        let nameFont = UIFont.systemFont(ofSize: max(10, min(22, edge * 0.13)), weight: .bold)
        let nameRect = CGRect(x: inset, y: headerHeight + inset, width: width, height: nameFont.lineHeight * 2)
        paragraph.lineBreakMode = .byWordWrapping
        draw(setup.name, in: nameRect, font: nameFont, color: ink)
        paragraph.lineBreakMode = .byTruncatingTail
        if edge >= 200 {
            let paths = Set(setup.cosigners.compactMap { $0.derivation })
            let path = paths.count == 1 && setup.cosigners.allSatisfy({ $0.derivation != nil })
                ? paths.first! : VaultLocalization.text("Custom derivation paths")
            let pathFont = UIFont.monospacedSystemFont(ofSize: min(14, edge * 0.065), weight: .medium)
            draw(path, in: CGRect(x: inset, y: nameRect.maxY + inset / 2, width: width, height: pathFont.lineHeight),
                 font: pathFont, color: VaultAppearance.color(0x475569))
        }
        return true
    }
}
