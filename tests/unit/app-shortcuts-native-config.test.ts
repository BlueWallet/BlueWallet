import { readFileSync } from 'fs';
import path from 'path';

const repositoryRoot = path.join(__dirname, '../..');
const readRepositoryFile = (relativePath: string) => readFileSync(path.join(repositoryRoot, relativePath), 'utf8');

describe('native app shortcut configuration', () => {
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
