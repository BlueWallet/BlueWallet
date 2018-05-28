import LocalizedStrings from 'react-localization';
import { AsyncStorage } from 'react-native';
import { Util } from 'expo';
import { AppStorage } from '../class';
let strings;
(async () => {
  let lang = await AsyncStorage.getItem(AppStorage.LANG);
  if (lang) {
    strings.setLanguage(lang);
    return;
  }

  // TODO: rewrite this when Expo version is upped
  if (Util.getCurrentLocaleAsync) {
    let locale = await Util.getCurrentLocaleAsync();
    if (locale) {
      locale = locale.split('-');
      locale = locale[0];
      console.log('current locale:', locale);
      if (locale === 'en' || locale === 'ru') {
        strings.setLanguage('ru');
      }
    }
  }
})();

strings = new LocalizedStrings({
  en: {
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
        // tabBarLabel: "Wallets",
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
        description:
          'A list of ingoing or outgoing transactions of your wallets',
        conf: 'conf',
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
      password_explain:
        'Create the password you will use to decrypt the storage',
      retype_password: 'Re-type password',
      passwords_do_not_match: 'Passwords do not match',
      encrypt_storage: 'Encrypt storage',
      about: 'About',
    },
  },
  ru: {
    wallets: {
      list: {
        tabBarLabel: 'Кошельки',
        app_name: 'BlueWallet',
        title: 'Мои Биткоин Кошельки',
        header:
          'Кошелек это секретный (приватный) ключ, и соответствующий ему адрес на который можно получать биткоины',
        add: 'Добавить Кошелек',
      },
      add: {
        // tabBarLabel: "Кошельки",
        title: 'Добавить Кошелек',
        description:
          'Вы можете отсканировать QR код (в формате WIF - Wallet Import Format), или создать новый кошелек. Segwit поддерживается по умолчанию.',
        scan: 'Отсканировать',
        create: 'Создать',
        label_new_segwit: 'Новый SegWit',
      },
      details: {
        title: 'Информация о Кошельке',
        address: 'Адрес',
        type: 'Тип',
        label: 'Метка',
        are_you_sure: 'Вы уверены?',
        yes_delete: 'Да, удалить',
        no_cancel: 'Нет, отмена',
        delete_this_wallet: 'Удалить этот кошелек',
        export_backup: 'Экспорт / резервная копия',
      },
      export: {
        title: 'Экспорт Кошелька',
      },
      scanQrWif: {
        go_back: 'Назад',
        cancel: 'Отмена',
        decoding: 'Декодирую',
        input_password: 'Введите пароль',
        password_explain: 'Приватный ключ зашифрован по стандарту BIP38',
        bad_password: 'Неверный пароль',
        wallet_already_exists: 'Такой кошелек уже существует',
        bad_wif: 'Некорректный WIF',
        imported_wif: 'Импортирован WIF ',
        with_address: ' с адресом ',
        imported_segwit: 'Импортированый SegWit',
        imported_legacy: 'Импортированый Legacy',
      },
    },
    transactions: {
      list: {
        tabBarLabel: 'Транзакции',
        title: 'Мои транзакции',
        description: 'Список входящих или исходящих транзакций ваших кошельков',
        conf: 'подтв.',
      },
    },
    send: {
      list: {
        tabBarLabel: 'Отправить',
        header: 'Выберите кошелек',
      },
      details: {
        title: 'Создать Транзакцию',
        amount_fiels_is_not_valid: 'Поле не валидно',
        fee_fiels_is_not_valid: 'Поле `комиссия` не валидно',
        address_fiels_is_not_valid: 'Поле `адресс` не валидно',
        receiver_placeholder: 'Адрес получателя',
        amount_placeholder: 'сколько отправить (в BTC)',
        fee_placeholder: 'плюс комиссия за перевод (в BTC)',
        memo_placeholder: 'примечание платежа',
        cancel: 'Отмена',
        scan: 'Скан QR',
        create: 'Создать',
        remaining_balance: 'Остаток баланса',
      },
      create: {
        title: 'Создать Транзакцию',
        error:
          'Ошибка при создании транзакции. Неправильный адрес назначения или недостаточно средств?',
        go_back: 'Назад',
        this_is_hex:
          'Это данные транзакции. Транзакция подписана и готова быть транслирована в сеть. Продолжить?',
        to: 'Куда',
        amount: 'Сколько',
        fee: 'Комиссия',
        tx_size: 'Размер',
        satoshi_per_byte: 'Сатоши на байт',
        memo: 'Примечание',
        broadcast: 'Отправить',
      },
    },
    receive: {
      list: {
        tabBarLabel: 'Получить',
        header: 'Выберите кошелек',
      },
      details: {
        title: 'Покажите этот адрес плательщику',
      },
    },
    settings: {
      tabBarLabel: 'Настройки',
      header: 'Настройки',
      plausible_deniability: 'Правдоподобное отрицание...',
      storage_not_encrypted: 'Хранилище: не зашифровано',
      password: 'Пароль',
      password_explain: 'Придумайте пароль для расшифровки хранилища',
      retype_password: 'Наберите пароль повторно',
      passwords_do_not_match: 'Пароли не совпадают',
      encrypt_storage: 'Зашифровать хранилище',
      about: 'О программе',
    },
  },
});

strings.setLanguage('ru');

module.exports = strings;
