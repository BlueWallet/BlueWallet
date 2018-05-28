module.exports = {
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
    details: {
      title: 'Детали транзакци',
      from: 'От',
      to: 'Кому',
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
};
