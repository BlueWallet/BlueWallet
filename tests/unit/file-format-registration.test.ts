import { readFileSync } from 'fs';
import path from 'path';

const repositoryRoot = path.join(__dirname, '../..');
const readRepositoryFile = (relativePath: string) => readFileSync(path.join(repositoryRoot, relativePath), 'utf8');

describe('accounting and BIP-329 file integration', () => {
  it('keeps BIP-329 registered for iOS Quick Look without advertising BlueWallet as a document-opening app', () => {
    const appInfo = readRepositoryFile('ios/BlueWallet/Info.plist');
    const quickLookInfo = readRepositoryFile('ios/QuickLookPreview/Info.plist');
    const documentTypes = appInfo.slice(
      appInfo.indexOf('<key>CFBundleDocumentTypes</key>'),
      appInfo.indexOf('<key>CFBundleExecutable</key>'),
    );

    expect(documentTypes).toMatch(
      /<string>BIP-329 Wallet Labels<\/string>[\s\S]*?<key>CFBundleTypeRole<\/key>\s*<string>None<\/string>[\s\S]*?<key>LSHandlerRank<\/key>\s*<string>None<\/string>[\s\S]*?<string>io\.bluewallet\.bip329<\/string>/,
    );
    expect(documentTypes).not.toMatch(
      /<string>BIP-329 Wallet Labels<\/string>[\s\S]*?<key>CFBundleTypeRole<\/key>\s*<string>(Editor|Viewer)<\/string>/,
    );
    expect(appInfo).toContain('<string>io.bluewallet.bip329</string>');
    expect(appInfo).toContain('<string>jsonl</string>');
    expect(quickLookInfo).toContain('<string>io.bluewallet.bip329</string>');
  });

  it('does not register Android VIEW, EDIT, or SEND handlers for JSONL or accounting CSV', () => {
    const manifest = readRepositoryFile('android/app/src/main/AndroidManifest.xml');

    expect(manifest).not.toContain('application/x-ndjson');
    expect(manifest).not.toContain('.*\\.jsonl');
    expect(manifest).not.toContain('text/csv');
    expect(manifest).not.toContain('.*\\.csv');
  });

  it('uses native UIKit controls and Dynamic Type in the Quick Look preview', () => {
    const preview = readRepositoryFile('ios/QuickLookPreview/PreviewViewController.swift');

    expect(preview).toContain('UISegmentedControl');
    expect(preview).toContain('UITableView');
    expect(preview).toContain('UITextView');
    expect(preview).toContain('UIFontMetrics');
    expect(preview).toContain('adjustsFontForContentSizeCategory = true');
    expect(preview).toContain('accessibilityLabel = "Preview format"');
    expect(preview).toContain('rawContainer.layer.cornerCurve = .continuous');
    expect(preview).toContain('rawContainer.layer.borderColor = UIColor.separator.cgColor');
    expect(preview).toContain('copyConfiguration.image = UIImage(systemName: "doc.on.doc")');
    expect(preview).toContain('rawFormatLabel.text = "JSON Lines · UTF-8"');
    expect(preview).toContain('UIPasteboard.general.string = rawTextView.text');
    expect(preview).toContain('loadViewIfNeeded()');
    expect(preview).toContain('if pathExtension != "jsonl"');
    expect(preview).toContain('title: "Preview unavailable"');
    expect(preview).toContain('titleForHeaderInSection');
    expect(preview).toContain('secondaryAttributedText = attributedDetail');
    expect(preview).toContain('.traitBold');
    expect(preview).toContain('cell.accessoryType = .disclosureIndicator');
    expect(preview).toContain('case "Transactions": return .systemBlue');
    expect(preview).toContain('case "Outputs": return .systemGreen');
    expect(preview).toContain('date.formatted(date: .abbreviated, time: .shortened)');
    expect(preview).toContain('number.int64Value.formatted(.number.grouping(.automatic))');
    expect(preview).toContain('return "Date"');
  });
});
