export type AddWalletStackParamList = {
  AddWallet: undefined;
  ImportWallet: { label?: string; triggerImport?: boolean };
  ImportWalletDiscovery: { importText: string; askPassphrase: boolean; searchAccounts: boolean };
  ImportCustomDerivationPath: { importText: string; password?: string };
  ImportSpeed: undefined;
  PleaseBackup: undefined;
  PleaseBackupLNDHub: undefined;
  PleaseBackupLdk: undefined;
  ProvideEntropy: undefined;
  WalletsAddMultisig: undefined;
  WalletsAddMultisigStep2: undefined;
  WalletsAddMultisigHelp: undefined;
};
