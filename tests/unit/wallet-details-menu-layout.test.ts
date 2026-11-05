import { readFileSync } from 'fs';
import path from 'path';

describe('wallet transaction-history menu layout', () => {
  it('uses a centered 44-point menu target with a stable icon line box', () => {
    const source = readFileSync(path.join(__dirname, '../../screen/wallets/WalletDetails.tsx'), 'utf8');
    const menuSource = readFileSync(path.join(__dirname, '../../components/TooltipMenu.tsx'), 'utf8');

    expect(source).toContain('buttonStyle={styles.statsMenuButton}');
    expect(source).toContain('testID="TransactionHistoryMenuButton"');
    expect(source).toContain('const walletTransactionsLength = wallet.getTransactions().length;');
    expect(source).toContain('{walletTransactionsLength > 0 && (');
    expect(source).toMatch(/statsMenuButton:\s*{\s*width: 44,\s*height: 44,\s*alignItems: 'center',\s*justifyContent: 'center'/);
    expect(source).toMatch(/statsMenuIcon:\s*{\s*width: 20,\s*height: 20,\s*lineHeight: 20,\s*textAlign: 'center'/);
    expect(menuSource).toContain('style={isButton ? styles.menuButtonContent : styles.menuFlex}');
    expect(menuSource).toMatch(
      /menuButtonContent:\s*{\s*flex: 1,\s*alignSelf: 'stretch',\s*alignItems: 'center',\s*justifyContent: 'center'/,
    );
  });

  it('registers HIG-grouped Wallet Details commands with contextual shortcuts', () => {
    const source = readFileSync(path.join(__dirname, '../../screen/wallets/WalletDetails.tsx'), 'utf8');
    const appDelegate = readFileSync(path.join(__dirname, '../../ios/BlueWallet/AppDelegate.swift'), 'utf8');

    expect(source).toContain('useScreenMenuActions({');
    expect(source).toContain('editWalletName: handleEditWalletName');
    expect(source).toContain('exportAccountingCsv:');
    expect(source).toContain("unsupportedFileType === 'numbers'");
    expect(source).toContain('loc.wallets.details_import_numbers_unsupported');
    expect(source).toContain('deleteWallet: handleDeleteButtonTapped');
    expect(appDelegate).toContain('io.bluewallet.walletDetails.historyExport');
    expect(appDelegate).toContain('options: .displayInline, children: [deleteWallet]');
    expect(appDelegate).toContain('("editWalletName", "Edit Wallet Name", "pencil"');
    expect(appDelegate).toContain('[.command, .alternate, .shift]');
  });
});
