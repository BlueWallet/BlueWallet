import { readFileSync } from 'fs';
import path from 'path';

const repositoryRoot = path.join(__dirname, '../..');
const readRepositoryFile = (relativePath: string) => readFileSync(path.join(repositoryRoot, relativePath), 'utf8');

describe('native app shortcut configuration', () => {
  it('registers image sharing as a Mac Catalyst-only extension', () => {
    const extensionInfo = readRepositoryFile('ios/ShareExtension/Info.plist');
    const extensionController = readRepositoryFile('ios/ShareExtension/ShareViewController.swift');
    const sharedImageStore = readRepositoryFile('ios/ShareExtension/SharedImageStore.swift');
    const appDelegate = readRepositoryFile('ios/BlueWallet/AppDelegate.swift');
    const sceneDelegate = readRepositoryFile('ios/BlueWallet/SceneDelegate.swift');
    const eventEmitter = readRepositoryFile('ios/Components/EventEmitter.swift');
    const project = readRepositoryFile('ios/BlueWallet.xcodeproj/project.pbxproj');
    const blueWalletScheme = readRepositoryFile('ios/BlueWallet.xcodeproj/xcshareddata/xcschemes/BlueWallet.xcscheme');
    const fastfile = readRepositoryFile('fastlane/Fastfile');
    const matchfile = readRepositoryFile('fastlane/Matchfile');
    const companionListeners = readRepositoryFile('hooks/useCompanionListeners.ts');

    expect(extensionInfo).toContain('<string>com.apple.share-services</string>');
    expect(extensionInfo).toContain('<key>NSExtensionActivationSupportsImageWithMaxCount</key>');
    expect(extensionController).toContain('SharedImageStore.appGroupStore()');
    expect(sharedImageStore).toContain('copyItem(at: sourceURL, to: destinationURL)');
    expect(sharedImageStore).toContain('pendingSharedImageFilename');
    expect(project.match(/platformFilter = maccatalyst;/g)).toHaveLength(2);
    expect(project).toContain('SUPPORTS_MACCATALYST = YES;');
    expect(project).toContain('match AppStore io.bluewallet.bluewallet.ShareExtension catalyst');
    expect(fastfile).toContain('Contents/PlugIns/ShareExtension.appex/Contents/MacOS/ShareExtension');
    expect(fastfile).toContain('File.join(archived_app, "Contents/PlugIns/ShareExtension.appex")');
    expect(matchfile).toContain('"io.bluewallet.bluewallet.ShareExtension"');
    expect(companionListeners).not.toContain("decodedUrl.includes('/shared-images/')");
    expect(companionListeners).toContain('isSharedImageEvent(event)');
    expect(companionListeners).toContain('readQRCodeFromImageFile(decodedUrl)');
    expect(extensionController).toContain('CFNotificationCenterPostNotification');
    expect(appDelegate).toContain('CFNotificationCenterAddObserver');
    expect(appDelegate).toContain('handlePendingSharedImageNotification()');
    expect(appDelegate).toContain('EventEmitter.shared()?.sendSharedImagePending()');
    expect(appDelegate).not.toContain('SharedImageStore.appGroupStore()?.consumePendingImageURL()');
    expect(sceneDelegate).not.toContain('forwardPendingSharedImageToReactNative()');
    expect(sharedImageStore).toContain('io.bluewallet.bluewallet.shared-image-imported');
    expect(appDelegate).toContain('CFNotificationCenterRemoveObserver');
    expect(sharedImageStore).toContain('guard !requestedName.isEmpty');
    expect(sharedImageStore).toContain('consumePendingImageURL()');
    expect(sharedImageStore).toContain('defaults.synchronize()');
    expect(eventEmitter).toContain('consumePendingSharedImage');
    expect(blueWalletScheme).toContain('BlueprintName = "BlueWalletUITests"');
    expect(blueWalletScheme).not.toContain('BlueprintName = "ShareExtensionTests"');
    expect(companionListeners).toContain('finally {');
    expect(companionListeners).toContain("await RNFS.unlink(decodedUrl.replace(/^file:\\/\\//, ''))");
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
