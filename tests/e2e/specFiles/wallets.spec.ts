import { expect } from 'detox';

import { isBeta, WALLET } from '../helpers';
import app from '../pageObjects';

describe('Wallets', () => {
  beforeEach(async () => {
    isBeta() && (await app.onboarding.betaVersionScreen.close());
    await app.termsConditionsScreen.scrollDown();
    await app.termsConditionsScreen.tapOnAgreeButton();
    await app.onboarding.passThrough('1111', 'qwertyui');
    await app.navigationBar.changeTab('wallets');
  });

  describe('Dashboard', () => {
    describe('@android @ios @smoke', () => {
      it('should display an empty list if there is no wallets added yet', async () => {
        await expect(app.wallets.dashboardScreen.noWalletsIcon).toBeVisible();
      });
    });

    describe('@android @ios @regression', () => {
      xit('should be possible to display details of wallet', async () => {});
    });
  });

  describe('Adding wallet', () => {
    describe('3-Key Vault', () => {
      describe('@android @ios @smoke', () => {
        it('should be possible to create a new 3-Key Vault wallet', async () => {
          await app.wallets.dashboardScreen.tapOnAddButton();

          await app.wallets.addNewWallet.createScreen.typeName('My Wallet');
          await app.wallets.addNewWallet.createScreen.chooseType('3-Key Vault');
          await app.wallets.addNewWallet.createScreen.tapOnCreateButton();

          await app.wallets.addNewWallet.addFastKeyScreen.tapScanOnQrCode();
          await app.wallets.addNewWallet.scanQrCodeScreen.scanCustomString(WALLET.FAST_PUBLIC_KEY); // TODO: Use valid string here

          await app.wallets.addNewWallet.addCancelKeyScreen.tapScanOnQrCode();
          await app.wallets.addNewWallet.scanQrCodeScreen.scanCustomString(WALLET.CANCEL_PUBLIC_KEY); // TODO: Use valid string here

          await app.wallets.addNewWallet.loadingScreen.waitUntilEnded();
          await app.wallets.addNewWallet.successScreen.tapOnCloseButton();
        });
      });

      xdescribe('@android @ios @regression', () => {
        xit('should be possible to import an existing 3-Key Vault wallet by using seed phrase', async () => {
          await app.wallets.dashboardScreen.tapOnAddButton();

          await app.wallets.addNewWallet.createScreen.tapOnImportButton();
          await app.wallets.importWallet.chooseWalletTypeScreen.chooseType('3-Key Vault');
          await app.wallets.importWallet.importScreen.typeName('My Imported Wallet');
          await app.wallets.importWallet.importScreen.typeSeedPhrase(''); // TODO: Use valid string here
          await app.wallets.importWallet.importScreen.submit(); // TODO: Use valid string here

          await app.wallets.importWallet.addFastKeyScreen.tapScanOnQrCode();
          await app.wallets.importWallet.scanQrCodeScreen.scanCustomString(''); // TODO: Use valid string here

          await app.wallets.importWallet.addCancelKeyScreen.tapScanOnQrCode();
          await app.wallets.importWallet.scanQrCodeScreen.scanCustomString(''); // TODO: Use valid string here

          await app.wallets.addNewWallet.loadingScreen.waitUntilEnded();
          await app.wallets.addNewWallet.successScreen.tapOnCloseButton();
        });

        xit('should be possible to import an existing 3-Key Vault wallet by scaning QR code', async () => {});

        it("shouldn't be possible to import a 3-Key Vault wallet with non-unique name", async () => {});
      });
    });

    xdescribe('2-Key Vault', () => {
      describe('@android @ios @regression', () => {
        xit('should be possible to create a new 2-Key Vault wallet', async () => {});

        xit('should be possible to import an existing 2-Key Vault wallet by using seed phrase', async () => {});

        xit('should be possible to import an existing 2-Key Vault wallet by scaning QR code', async () => {});
      });
    });

    xdescribe('Standard HD P2SH', () => {
      describe('@android @ios @regression', () => {
        it('should be possible to create a new Standard HD P2SH wallet', async () => {});

        it('should be possible to import an existing Standard wallet by using seed phrase', async () => {});

        it('should be possible to import an existing Standard wallet by scaning QR code', async () => {});
      });
    });

    xdescribe('Advanced wallets', () => {
      it('should be possible to create a new Standard P2SH wallet', async () => {});

      it('should be possible to create a new Standard HD SegWit wallet', async () => {});
    });

    xdescribe('@android @ios @regression', () => {
      it("shouldn't be possible to create a new wallet with non-unique name", async () => {});

      it("shouldn't be possible to create a new wallet with empty name", async () => {});

      it("shouldn't be possible to create a new wallet with name including special characters", async () => {});
    });
  });

  xdescribe('Details', () => {});
});
