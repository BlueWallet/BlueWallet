import { by, element } from 'detox';

import actions from '../../actions';
import MessageScreen from '../common/MessageScreen';
import ScanQrCodeScreen from '../common/ScanQrCodeScreen';

export type WalletType = '3-Key Vault' | '2-Key Vault' | 'Standard HD P2SH' | 'Standard P2SH' | 'Standard HD SegWit';

export interface TwoKeyWalletOptions {
  cancelPublicKey: string;
}

export interface ThreeKeyWalletOptions {
  fastPublicKey: string;
  cancelPublicKey: string;
}

const Wallets = () => {
  const DashboardScreen = () => ({
    noWalletsIcon: element(by.id('no-wallets-icon')),
    filterTransactionsButton: element(by.id('filter-transactions-button')),
    addButton: element(by.id('add-wallet-button')),

    async tapOnAddButton() {
      await actions.tap(this.addButton);
    },

    async tapOnFilterButton() {
      await actions.tap(this.filterTransactionsButton);
    },

    async tapOnWallet(name: string) {
      const wallet = element(by.id(`wallet-${name}`));

      await actions.tap(wallet);
    },
  });

  const AddNewWallet = () => {
    const CreateScreen = () => ({
      nameInput: element(by.id('create-wallet-name-input')),
      nameValidationError: element(by.id('create-wallet-name-input-validation-error')),

      walletTypeRadios: {
        '3-Key Vault': element(by.id('3-key-vault-radio')),
        '2-Key Vault': element(by.id('2-key-vault-radio')),
        'Standard HD P2SH': element(by.id('hd-p2sh-radio')),
        'Standard P2SH': element(by.id('segwit-p2sh-radio')),
        'Standard HD SegWit': element(by.id('hd-segwit-p2sh-radio')),
      },

      createWalletButton: element(by.id('create-wallet-button')),
      importWalletButton: element(by.id('import-wallet-button')),

      async typeName(value: string) {
        await actions.typeText(this.nameInput, value);
      },

      async chooseType(type: WalletType) {
        await actions.tap(this.walletTypeRadios[type]);
      },

      async tapOnCreateButton() {
        await actions.tap(this.createWalletButton);
      },

      async tapOnImportButton() {
        await actions.tap(this.importWalletButton);
      },
    });

    const AddFastKeyScreen = () => ({
      scanQrCodeButton: element(by.id('scan-public-key-code-button')),

      async tapScanOnQrCode() {
        await actions.tap(this.scanQrCodeButton);
      },
    });

    const AddCancelKeyScreen = () => ({
      scanQrCodeButton: element(by.id('scan-public-key-code-button')),

      async tapScanOnQrCode() {
        await actions.tap(this.scanQrCodeButton);
      },
    });

    const SuccessScreen = () => ({
      closeButton: element(by.id('close-button')),

      async tapOnCloseButton() {
        await actions.tap(this.closeButton);
      },
    });

    return {
      createScreen: CreateScreen(),
      addFastKeyScreen: AddFastKeyScreen(),
      addCancelKeyScreen: AddCancelKeyScreen(),
      scanQrCodeScreen: ScanQrCodeScreen(),
      loadingScreen: MessageScreen('processingState'),
      successScreen: SuccessScreen(),
    };
  };

  const ImportWallet = () => {
    const ChooseWalletTypeScreen = () => ({
      walletTypeRadios: {
        '3-Key Vault': element(by.id('3-key-vault-radio')),
        '2-Key Vault': element(by.id('2-key-vault-radio')),
        // eslint-disable-next-line prettier/prettier
        'Standard': element(by.id('standard-wallet-radio')),
      },
      proceedButton: element(by.id('confirm-import-button')),

      async chooseType(type: WalletType) {
        await actions.tap(this.walletTypeRadios[type]);
      },

      async tapOnProceedButton() {
        await actions.tap(this.proceedButton);
      },
    });

    const ImportScreen = () => ({
      nameInput: element(by.id('import-wallet-name')),
      nameValidationError: element(by.id('import-wallet-name-validation-error')),
      seedPhraseInput: element(by.id('import-wallet-seed-phrase')),
      seedPhraseValidationError: element(by.id('import-wallet-seed-phrase-validation-error')),
      submitButton: element(by.id('submit-import-wallet-button')),
      scanQrButton: element(by.id('scan-import-wallet-qr-code-button')),

      async typeName(value: string) {
        await actions.typeText(this.nameInput, value);
      },

      async typeSeedPhrase(value: string) {
        await actions.typeText(this.seedPhraseInput, value);
      },

      async submit() {
        await actions.tap(this.submitButton);
      },

      async tapScanOnQrCode() {
        await actions.tap(this.scanQrButton);
      },
    });

    const AddFastKeyScreen = () => ({
      scanQrCodeButton: element(by.id('scan-public-key-code-button')),

      async tapScanOnQrCode() {
        await actions.tap(this.scanQrCodeButton);
      },
    });

    const AddCancelKeyScreen = () => ({
      scanQrCodeButton: element(by.id('scan-public-key-code-button')),

      async tapScanOnQrCode() {
        await actions.tap(this.scanQrCodeButton);
      },
    });

    return {
      chooseWalletTypeScreen: ChooseWalletTypeScreen(),
      importScreen: ImportScreen(),
      addFastKeyScreen: AddFastKeyScreen(),
      addCancelKeyScreen: AddCancelKeyScreen(),
      scanQrCodeScreen: ScanQrCodeScreen(),
      loadingScreen: MessageScreen('processingState'),
      successScreen: MessageScreen('success'),
    };
  };

  const dashboardScreen = DashboardScreen();
  const addNewWallet = AddNewWallet();
  const importWallet = ImportWallet();
  const scanQrCodeScreen = ScanQrCodeScreen();

  async function createWallet(
    type: 'Standard HD P2SH' | 'Standard P2SH' | 'Standard HD SegWit',
    name: string,
    options: undefined,
  ): Promise<void>;
  async function createWallet(type: '2-Key Vault', name: string, options: TwoKeyWalletOptions): Promise<void>;
  async function createWallet(type: '3-Key Vault', name: string, options: ThreeKeyWalletOptions): Promise<void>;
  async function createWallet(type: WalletType, name: string, options: unknown): Promise<void> {}

  async function importExistingWallet(
    type: 'Standard HD P2SH' | 'Standard P2SH' | 'Standard HD SegWit',
    name: string,
    options: undefined,
  ): Promise<void>;
  async function importExistingWallet(type: '2-Key Vault', name: string, options: TwoKeyWalletOptions): Promise<void>;
  async function importExistingWallet(type: '3-Key Vault', name: string, options: ThreeKeyWalletOptions): Promise<void>;
  async function importExistingWallet(type: WalletType, name: string, options: unknown): Promise<void> {}

  return { dashboardScreen, addNewWallet, importWallet, scanQrCodeScreen, createWallet, importExistingWallet };
};

export default Wallets;
