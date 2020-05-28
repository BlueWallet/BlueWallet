module.exports = {
  _: {
    storage_is_encrypted: 'Kasanız şifrelidir. Açmak için parola gereklidir.',
    enter_password: 'Parolayı girin',
    bad_password: 'Yanlış parola, tekrar deneyin',
    never: 'asla',
    continue: 'Devam et',
    ok: 'Tamam'
  },
  message: {
    somethingWentWrong: 'Bir sorun meydana geldi',
    somethingWentWrongWhileCreatingWallet: 'Cüzdanınızı oluştururken bir sorun meydana geldi Lütfen Panoya dönün ve yeniden deneyin.',
    success: 'Başarılı',
    successfullWalletImport: 'Cüzdanınız başarıyla içeri aktarıldı. Şimdi Panoya geri dönebilirsiniz.',
    successfullWalletDelete: 'Cüzdanınız başarıyla silindi. Şimdi Panoya geri dönebilirsiniz.',
    returnToDashboard: 'Panoya Geri Dön',
    creatingWallet: 'Cüzdanınız oluşturuluyor',
    creatingWalletDescription: 'Lütfen cüzdanınız oluşturulurken bekleyin. Biraz zaman alabilir.'
  },
  onboarding: {
    onboarding: 'Katılım',
    pin: 'PIN',
    createPin: 'PIN oluştur',
    createNewPin: 'Yeni PIN',
    createPassword: 'İşlem şifresi oluştur',
    createPinDescription: 'PIN’iniz uygulamaya giriş yapmak için kullanılacaktır. Daha sonra Ayarlar bölümünden değiştirebilirsiniz.',
    confirmPin: 'PIN’i Onayla',
    confirmNewPin: 'Yeni PIN’i Onayla',
    confirmPassword: 'İşlem şifresini onayla',
    passwordDoesNotMatch: 'Şifre eşleşmiyor. Lütfen geçerli bir şifre girin.',
    createPasswordDescription: 'İşlem Şifreniz tüm işlemleri doğrulamak için kullanılacak. Daha sonra değiştiremezsiniz. İşlem Şifresi en az 8 alfanümreik karakter içermelidir.',
    changePin: 'PIN’i Değiştir',
    currentPin: 'Mevcut PIN',
    pinDoesNotMatch: 'PIN eşleşmiyor. Lütfen geçerli bir PIN girin.',
    successDescription: 'Oley!  PIN’inizi başarıyla oluşturdunuz.',
    successDescriptionChangedPin: 'Oley!  PIN’inizi başarıyla değiştirdiniz.',
    successButton: 'Panoya Git',
    successButtonChangedPin: 'Ayarlara Geri Dön'
  },
  unlock: {
    title: 'Kilidi Aç',
    touchID: '“Altın Cüzdan” için Dokunmatik Kimlik',
    confirmButton: 'Devam etmek için parmak iziyle doğrulama yapın.',
    enter: 'PIN Girin'
  },
  unlockTransaction: {
    headerText: 'İşlemi onayla',
    title: 'İşlem Şifresini Onayla',
    description: 'İşleme devam etmek için İşlem Şifresini Onaylayın.'
  },
  wallets: {
    dashboard: {
      title: 'Cüzdanlar',
      noWallets: 'Cüzdan yok',
      noWalletsDesc1: 'Gösterilecek cüzdan yok.',
      noWalletsDesc2: 'İlk cüzdanınızı eklemek için.',
      send: 'Coin gönder',
      receive: 'Coin al',
      noTransactions: 'Gösterilecek işlem yok.'
    },
    walletModal: { btcv: 'BTCV', wallets: 'Cüzdanlar' },
    importWallet: {
      title: 'Cüzdanınızı içeri aktarın',
      header: 'Cüzdanı içeri aktar',
      subtitle: 'Buraya hatırlatıcı ipucunuzu, özel anahtarınızı, WIF’ı veya sahip olduğunuz başka bir şeyi yazın. GoldWallet doğru biçimi tahmin etmek ve cüzdanınızı içeri aktarmak için elinden geleni yapacak.',
      placeholder: 'Özel ipucu, özel anahtar, WIF',
      import: 'İçeri aktar',
      scanQrCode: 'veya QR kodunu tara',
      walletInUseValidationError: 'Cüzdan zaten kullanılıyor. Lütfen geçerli bir cüzdan girin.'
    },
    exportWallet: { title: 'Özel ipucu ifadesi', header: 'Cüzdanı dışarı aktar' },
    exportWalletXpub: { header: 'Cüzdanın XPUB’ı' },
    deleteWallet: {
      title: 'Cüzdanınızı silin',
      header: 'Cüzdanı sil',
      description1: 'Silmek istediğinizden emin misiniz',
      description2: '? Bu işlemi geri alamazsınız.',
      no: 'Hayır',
      yes: 'Evet'
    },
    wallet: { none: 'Hiçbiri', latest: 'Son işlem' },
    add: {
      title: 'Yeni cüzdan ekle',
      subtitle: 'Cüzdanınıza ad verin',
      description: 'Lütfen cüzdanınız için bir ad girin.',
      inputLabel: 'Ad',
      addWalletButton: 'Yeni cüzdan ekle',
      importWalletButton: 'Cüzdanı içeri aktar',
      advancedOptions: 'Gelişmiş seçenekler',
      multipleAddresses: 'Çoklu adresler',
      singleAddress: 'Tek adres',
      segwidAddress: 'Tek bir 24 kelimelik seedden oluşturulmuş yerli segwit adreslerinden oluşan ağaç içerir'
    },
    addSuccess: {
      title: 'Yeni cüzdan ekle',
      subtitle: 'Başarılı',
      description: 'Cüzdanınız oluşturuldu. Lütfen özel ipucu ifadesini bir kağıda not almak için zaman ayırın. Bu sizin yedeğiniz olacaktır. Diğer cihazlarda cüzdanı geri yüklemek için kullanabilirsiniz.',
      okButton: 'Tamam, bunu yazdım!'
    },
    details: {
      latestTransaction: 'Son işlem',
      typeLabel: 'Tür',
      nameLabel: 'Ad',
      exportWallet: 'Cüzdanı dışarı aktar',
      showWalletXPUB: 'Cüzdan XPUB’ını göster',
      deleteWallet: 'Cüzdanı sil',
      nameEdit: 'Adı düzenle'
    },
    export: { title: 'Cüzdanı dışarı aktarma' },
    import: {
      title: 'İçeri aktar',
      explanation: 'Buraya hatırlatıcı ipucunuzu, özel anahtarınızı, WIF’ı veya sahip olduğunuz başka bir şeyi yazın. GoldWallet doğru biçimi tahmin etmek ve cüzdanınızı içeri aktarmak için elinden geleni yapacak',
      imported: 'İçeri aktarıldı',
      error: 'İçeri aktarılamadı. Lütfen sağlanan verilerin geçerli olduğundan emin olun.',
      success: 'Başarılı',
      do_import: 'İçeri aktar',
      scan_qr: 'veya onun yerine QR kodunu tarasın mı?'
    },
    scanQrWif: {
      go_back: 'Geri Git',
      cancel: 'İptal Et',
      decoding: 'Şifre çözülüyor',
      input_password: 'Parola girin',
      password_explain: 'Bu BIP38 şifrelenmiş özel anahtardır',
      bad_password: 'Yanlış parola',
      wallet_already_exists: 'Böyle bir cüzdan zaten var',
      bad_wif: 'Yanlış WIF',
      imported_wif: 'WIF İçeri Aktarıldı',
      with_address: 'adres ile',
      imported_segwit: 'İçeri Aktarılan SegWit',
      imported_legacy: 'İçeri Aktarılan Eski',
      imported_watchonly: 'İçeri Aktarılan Yalnızca İzlenebilir'
    }
  },
  transactions: {
    list: { conf: 'Onaylar' },
    details: {
      title: 'İşlem',
      detailTitle: 'İşlem ayrıntıları',
      transactionHex: 'İşlem on altılığı',
      transactionHexDescription: 'Bu işlem on altılığıdır, imzalanmıştır ve ağda yayınlanmaya hazırdır',
      copyAndBoriadcast: 'Kopyala ve daha sonra yayınla',
      verify: 'Coinb.in üzerinde doğrula',
      amount: 'Tutar',
      fee: 'Ücret',
      txSize: 'TX boyutu',
      satoshiPerByte: 'Bayt başına Satoshi',
      from: 'Gönderen',
      to: 'Alıcı',
      bytes: 'bayt',
      copy: 'Kopyala',
      noLabel: 'Etiket yok',
      details: 'Ayrıntılar',
      transactionId: 'İşlem Kimliği',
      confirmations: 'onaylar',
      transactionDetails: 'İşlem ayrıntıları',
      viewInBlockRxplorer: 'Blok gezgininde görüntüle',
      addNote: 'Not ekle',
      note: 'Not',
      inputs: 'Girdiler',
      ouputs: 'Çıktılar',
      sendCoins: 'Coin gönder'
    }
  },
  send: {
    header: 'Coin gönder',
    success: {
      title: 'Başarılı',
      description: 'Oley! İşlemi başarıyla tamamladınız.',
      done: 'Tamamlandı',
      return: 'Panoya Geri Dön'
    },
    details: {
      title: 'işlem oluştur',
      amount_field_is_not_valid: 'Tutar alanı geçerli değil',
      fee_field_is_not_valid: 'Ücret alanı geçerli değil',
      address_field_is_not_valid: 'Adres alanı geçerli değil',
      create_tx_error: 'İşlem oluşturulurken bir hata oluştu. Lütfen adresin geçerli olduğundan emin olun.',
      address: 'adres',
      amount_placeholder: 'gönderilecek tutar (BTCV cinsinden)',
      fee_placeholder: 'artı işlem ücreti (BTCV cinsinden)',
      note_placeholder: 'kendime not',
      cancel: 'İptal Et',
      scan: 'Tara',
      send: 'Gönder',
      next: 'İleri',
      to: 'Alıcı',
      feeUnit: 'Sat/B',
      fee: 'Ücret:',
      create: 'Fatura Oluştur',
      remaining_balance: 'Kalan bakiye',
      total_exceeds_balance: 'Gönderilen tutar kullanılabilir bakiyeyi aşıyor.'
    },
    confirm: { sendNow: 'Şimdi gönder' },
    create: {
      amount: 'Tutar',
      fee: 'Ücret',
      setTransactionFee: 'Bir işlem ücreti belirle',
      headerText: 'Ağda bekleyen çok sayıda işlem olduğunda (>1500), işleminizin daha hızlı işlenmesi için gereken ücret artacaktır. Genel değerler 1-500 sat/b’dir.'
    }
  },
  receive: {
    header: 'Coin al',
    details: {
      amount: 'Tutar',
      share: 'Paylaş',
      receiveWithAmount: 'Tutarla al'
    }
  },
  settings: {
    language: 'Dil',
    general: 'Genel',
    security: 'Güvenlik',
    about: 'Hakkında',
    electrumServer: 'Electrum sunucusu',
    advancedOptions: 'Gelişmiş seçenekler',
    changePin: 'PIN Değiştir',
    fingerprintLogin: 'Parmak iziyle giriş',
    aboutUs: 'Hakkımızda',
    header: 'Ayarlar',
    notSupportedFingerPrint: 'Cihazınız parmak izini desteklemiyor',
    TouchID: 'Parmak izine izin ver',
    FaceID: 'FaceID’ye izin ver',
    Biometrics: 'Biometriklere izin ver'
  },
  aboutUs: {
    header: 'Hakkımızda',
    releaseNotes: 'Sürüm notları',
    runSelfTest: 'Otomatik testi çalıştır',
    buildWithAwesome: 'Muhteşem özellikle oluştur:',
    rateGoldWallet: 'GoldWallet’ı Puanla',
    goToOurGithub: 'Github’umuza Git',
    alwaysBackupYourKeys: 'Her zaman anahtarlarınızı yedekleyin',
    title: 'Gold Wallet ücretsiz ve açık kaynaklı bir Bitcoin Vault cüzdanıdır. Lisanslı MIT.'
  },
  electrumServer: {
    header: 'Electrum sunucusu',
    title: 'Electrum sunucusunu değiştir',
    description: 'Uygulamanızın bağlanacağı sunucunun adresini değiştirebilirsiniz. Varsayılan adres önerilir.',
    save: 'Kaydet',
    useDefault: 'Varsayılanı kullan',
    host: 'ana bilgisayar',
    port: 'port',
    successfullSave: 'Değişiklikleriniz başarıyla kaydedildi. Değişikliklerin geçerli olması için yeniden başlatma gerekebilir.',
    connectionError: 'Sağlanan Electrum sunucusuna bağlanılamıyor'
  },
  advancedOptions: {
    title: 'Gelişmiş seçenekleri yapılandır',
    description: 'Gelişmiş seçenekleri yapılandırmak aşağıda yer alan farklı cüzdan türleri arasından seçim yapmanıza imkan verir: \n' +
      'P2SH, HD P2SH, HD segwit.'
  },
  selectLanguage: {
    header: 'Dil',
    restartInfo: 'Yeni bir dil seçerken GoldWallet’ı yeniden başlatmak değişikliğin geçerli olması için gerekli olabilir',
    confirmation: 'Onay',
    confirm: 'Onayla',
    alertDescription: 'Dili seçilsin ve uygulama yeniden başlatılsın mı?',
    cancel: 'İptal Et'
  },
  contactList: {
    cancel: 'İptal Et',
    search: 'Ara',
    bottomNavigationLabel: 'Adres Defteri',
    screenTitle: 'Adres Defteri',
    noContacts: 'Kişi yok',
    noContactsDesc1: 'Gösterilecek kişi yok. \nTıkla',
    noContactsDesc2: 'İlk bağlantınızı ekleyin.',
    noResults: 'Şunun için sonuç yok:'
  },
  contactCreate: {
    screenTitle: 'Yeni kişi ekle',
    subtitle: 'Yeni kişi',
    description: 'Lütfen yeni kişinizin\nadını ve adresini girin.',
    nameLabel: 'Ad',
    addressLabel: 'Adres',
    buttonLabel: 'Yeni kişi ekle',
    successTitle: 'Başarılı',
    successDescription: 'Oley! Başarılı bir şekilde\nyeni kişi eklediniz.',
    successButton: 'Adres defterine geri dön'
  },
  contactDetails: {
    nameLabel: 'Ad',
    addressLabel: 'Adres',
    editName: 'Adı düzenle',
    editAddress: 'Adresi düzenle',
    sendCoinsButton: 'Coin gönder',
    showQRCodeButton: 'QR kodunu göster',
    deleteButton: 'Kişiyi sil',
    share: 'Paylaş'
  },
  contactDelete: {
    title: 'Kişinizi silin',
    header: 'Kişiyi sil',
    description1: 'Silmek istediğinizden emin misiniz',
    description2: '?\nBu işlemi geri alamazsınız.',
    no: 'Hayır',
    yes: 'Evet',
    success: 'Başarılı',
    successDescription: 'Kişiniz başarıyla silindi.\nŞimdi Adres Defterine geri dönebilirsiniz.',
    successButton: 'Adres defterine geri dön'
  },
  scanQrCode: {
    permissionTitle: 'Kamera kullanma izni',
    permissionMessage: 'Kameranızı kullanmak için izninize ihtiyacımız var.',
    ok: 'Tamam',
    cancel: 'İptal Et'
  }
}
