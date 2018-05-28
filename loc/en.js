module.exports = {
  wallets: {
    list: {
      tabBarLabel: 'Wallets',
      app_name: 'Blue Wallet',
      title: 'My Bitcoin Wallets',
      header:
        'A wallet represents a pair of a secret (private key) and an address' +
        'you can share to receive coins.',
      add: 'Add Wallet',
    },
    add: {
      title: 'Add Wallet',
      description:
        'You can either scan backup paper wallet (in WIF - Wallet Import Format), or create a new wallet. Segwit wallets supported by default.',
      scan: 'Scan',
      create: 'Create',
      label_new_segwit: 'New SegWit',
    },
    details: {
      title: 'Wallet Details',
      address: 'Address',
      type: 'Type',
      label: 'Label',
      are_you_sure: 'Are you sure?',
      yes_delete: 'Yes, delete',
      no_cancel: 'No, cancel',
      delete_this_wallet: 'Delete this wallet',
      export_backup: 'Export / backup',
    },
    export: {
      title: 'Wallet Export',
    },
    scanQrWif: {
      go_back: 'Go Back',
      cancel: 'Cancel',
      decoding: 'Decoding',
      input_password: 'Input password',
      password_explain: 'This is BIP38 encrypted private key',
      bad_password: 'Bad password',
      wallet_already_exists: 'Such wallet already exists',
      bad_wif: 'Bad WIF',
      imported_wif: 'Imported WIF ',
      with_address: ' with address ',
      imported_segwit: 'Imported SegWit',
      imported_legacy: 'Imported Legacy',
    },
  },
  transactions: {
    list: {
      tabBarLabel: 'Transactions',
      title: 'My Transactions',
      description: 'A list of ingoing or outgoing transactions of your wallets',
      conf: 'conf',
    },
    details: {
      title: 'Transaction details',
      from: 'From',
      to: 'To',
    },
  },
  send: {
    list: {
      tabBarLabel: 'Send',
      header: 'Choose a wallet',
    },
    details: {
      title: 'Create Transaction',
      amount_fiels_is_not_valid: 'Amount field is not valid',
      fee_fiels_is_not_valid: 'Fee field is not valid',
      address_fiels_is_not_valid: 'Address field is not valid',
      receiver_placeholder: 'receiver address here',
      amount_placeholder: 'amount to send (in BTC)',
      fee_placeholder: 'plus transaction fee (in BTC)',
      memo_placeholder: 'memo to self',
      cancel: 'Cancel',
      scan: 'Scan',
      create: 'Create',
      remaining_balance: 'Remaining balance',
    },
    create: {
      title: 'Create Transaction',
      error: 'Error creating transaction. Invalid address or send amount?',
      go_back: 'Go Back',
      this_is_hex:
        'This is transaction hex, signed and ready to be broadcast to the network. Continue?',
      to: 'To',
      amount: 'Amount',
      fee: 'Fee',
      tx_size: 'TX size',
      satoshi_per_byte: 'satoshiPerByte',
      memo: 'Memo',
      broadcast: 'Broadcast',
    },
  },
  receive: {
    list: {
      tabBarLabel: 'Receive',
      header: 'Choose a wallet',
    },
    details: {
      title: 'Share this address with payer',
    },
  },
  settings: {
    tabBarLabel: 'Settings',
    header: 'Settings',
    plausible_deniability: 'Plausible deniability...',
    storage_not_encrypted: 'Storage: not encrypted',
    password: 'Password',
    password_explain: 'Create the password you will use to decrypt the storage',
    retype_password: 'Re-type password',
    passwords_do_not_match: 'Passwords do not match',
    encrypt_storage: 'Encrypt storage',
    about: 'About',
  },
};
