import { readFileSync } from 'fs';
import path from 'path';

const repositoryRoot = path.join(__dirname, '../..');
const readRepositoryFile = (relativePath: string) => readFileSync(path.join(repositoryRoot, relativePath), 'utf8');

describe('native app shortcut configuration', () => {
  it('does not register BlueWallet as an image viewer on iOS or Android', () => {
    const infoPlist = readRepositoryFile('ios/BlueWallet/Info.plist');
    const androidManifest = readRepositoryFile('android/app/src/main/AndroidManifest.xml');
    const androidViewFilters = androidManifest
      .match(/<intent-filter[^>]*>[\s\S]*?<\/intent-filter>/g)
      ?.filter(intentFilter => intentFilter.includes('android.intent.action.VIEW'));

    expect(infoPlist).not.toMatch(/<string>public\.(?:image|jpeg|png|heic)<\/string>/);
    expect(androidViewFilters?.join('\n')).not.toContain('android:mimeType="image/');
    expect(androidViewFilters?.join('\n')).not.toContain('android:pathPattern=".*\\\\.*"');
  });

  it('registers image receiving as a share service on iOS and Android', () => {
    const shareExtensionInfo = readRepositoryFile('ios/ShareExtension/Info.plist');
    const androidManifest = readRepositoryFile('android/app/src/main/AndroidManifest.xml');
    const androidSendFilters = androidManifest
      .match(/<intent-filter[^>]*>[\s\S]*?<\/intent-filter>/g)
      ?.filter(intentFilter => intentFilter.includes('android.intent.action.SEND'));

    expect(shareExtensionInfo).toContain('<string>com.apple.share-services</string>');
    expect(shareExtensionInfo).toContain('<key>NSExtensionActivationSupportsImageWithMaxCount</key>');
    expect(shareExtensionInfo).toContain('<key>CFBundleIdentifier</key>');
    expect(shareExtensionInfo).toContain('<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>');
    expect(shareExtensionInfo).toContain('<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>');
    expect(androidSendFilters?.some(intentFilter => intentFilter.includes('android:mimeType="image/*"'))).toBe(true);

    const shareViewController = readRepositoryFile('ios/ShareExtension/ShareViewController.swift');
    const companionListeners = readRepositoryFile('hooks/useCompanionListeners.ts');
    expect(shareViewController).toContain('copyItem(at: sourceURL, to: destinationURL)');
    expect(shareViewController).not.toContain('pngData()');
    expect(shareViewController).not.toContain('UIImage(contentsOfFile:');
    expect(shareViewController).not.toContain('detectQRCode');
    expect(companionListeners).toContain("decodedUrl.includes('/shared-images/')");
  });

  it('limits Android browsable links to the static BlueWallet shortcut routes', () => {
    const manifest = readRepositoryFile('android/app/src/main/AndroidManifest.xml');
    const browsableFilters = manifest
      .match(/<intent-filter[\s\S]*?<\/intent-filter>/g)
      ?.filter(intentFilter => intentFilter.includes('android.intent.category.BROWSABLE'));

    expect(browsableFilters).toHaveLength(1);
    expect(browsableFilters?.[0].match(/android:scheme="([^"]+)"/g)).toEqual([
      'android:scheme="bluewallet"',
      'android:scheme="bluewallet"',
      'android:scheme="bluewallet"',
      'android:scheme="bluewallet"',
    ]);
    expect(browsableFilters?.[0].match(/android:host="([^"]+)"/g)).toEqual([
      'android:host="send"',
      'android:host="receive"',
      'android:host="scan"',
      'android:host="manage-wallets"',
    ]);
    expect(browsableFilters?.[0]).not.toMatch(/setelectrumserver|setlndhuburl/);
  });

  it('uses registered custom-scheme URLs for iOS App Intents', () => {
    const shortcuts = readRepositoryFile('ios/Widgets/WalletAppShortcuts.swift');

    expect(shortcuts).not.toContain('https://bluewallet.io/');
    expect(shortcuts.match(/bluewallet:\/\/(send|receive|scan|manage-wallets)/g)).toHaveLength(4);
  });

  it('keeps the price shortcut available before iOS 18', () => {
    const shortcuts = readRepositoryFile('ios/Widgets/WalletAppShortcuts.swift');
    const appDelegate = readRepositoryFile('ios/BlueWallet/AppDelegate.swift');

    expect(shortcuts).toContain('@available(iOS 16.4, visionOS 1.0, *)\nstruct WalletAppShortcuts');
    expect(shortcuts).toContain('if #available(iOS 18.0, visionOS 2.0, *)');
    expect(appDelegate).toContain('if #available(iOS 16.4, visionOS 1.0, *)');
  });

  it('forwards scene user activities to React Native only once', () => {
    const sceneDelegate = readRepositoryFile('ios/BlueWallet/SceneDelegate.swift');

    expect(sceneDelegate).not.toContain('RCTLinkingManager.scene(scene, continue: userActivity)');
  });
});
