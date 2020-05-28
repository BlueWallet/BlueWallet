module.exports = {
  _: {
    storage_is_encrypted: 'Penyimpanan Anda dienkripsi. Perlu kata sandi untuk mendekripsinya',
    enter_password: 'Masukkan kata sandi',
    bad_password: 'Kata sandi buruk, coba lagi',
    never: 'tidak pernah',
    continue: 'Lanjutkan',
    ok: 'OK'
  },
  message: {
    somethingWentWrong: 'Terjadi kesalahan',
    somethingWentWrongWhileCreatingWallet: 'Terjadi kesalahan saat kami membuat dompet Anda. Silakan kembali ke Dasbor dan coba lagi.',
    success: 'Berhasil',
    successfullWalletImport: 'Dompet Anda berhasil diimpor. Anda sekarang dapat kembali ke Dasbor.',
    successfullWalletDelete: 'Dompet Anda berhasil dihapus. Anda sekarang dapat kembali ke Dasbor.',
    returnToDashboard: 'Kembali ke Dasbor',
    creatingWallet: 'Membuat dompet Anda',
    creatingWalletDescription: 'Mohon kesabaran Anda sementara kami membuat dompet Anda. Ini mungkin membutuhkan waktu.'
  },
  onboarding: {
    onboarding: 'Onboarding',
    pin: 'PIN',
    createPin: 'Buat PIN',
    createNewPin: 'PIN Baru',
    createPassword: 'Buat sandi transaksi',
    createPinDescription: 'PIN Anda kan digunakan untuk masuk ke aplikasi. Anda dapat melakukan perubahan nanti di bagian pengaturan.',
    confirmPin: 'Konfirmasi PIN',
    confirmNewPin: 'Konfirmasi PIN baru',
    confirmPassword: 'Konfirmasi sandi transaksi',
    passwordDoesNotMatch: 'Kata sandi tidak cocok. Mohon masukkan kata sandi yang valid.',
    createPasswordDescription: 'Kata Sandi Transaksi Anda akan digunakan untuk memverifikasi semua transaksi. Anda tidak dapat melakukan perubahan setelah ini. Sandi Transaksi harus paling tidak terdiri dari 8 karakter alfanumerik.',
    changePin: 'Ubah PIN',
    currentPin: 'PIN Sekarang',
    pinDoesNotMatch: 'PIN tidak cocok. Mohon masukkan PIN yang valid.',
    successDescription: 'Hore!\nPIN Anda telah berhasil dibuat.',
    successDescriptionChangedPin: 'Hore!\nPIN Anda telah berhasil dirubah.',
    successButton: 'Pergi ke Dasbor',
    successButtonChangedPin: 'Kembali ke Pengaturan'
  },
  unlock: {
    title: 'Buka Kunci',
    touchID: 'Touch ID untuk "Gold Wallet"',
    confirmButton: 'Konfirmasi sidik jari Anda untuk melanjutkan.',
    enter: 'Masukkan PIN'
  },
  unlockTransaction: {
    headerText: 'Konfirmasi transaksi',
    title: 'Konfirmasi Kata Sandi Transaksi',
    description: 'Konfirmasi Kata Sandi Transaksi untuk melanjutkan transaksi.'
  },
  wallets: {
    dashboard: {
      title: 'Dompet',
      noWallets: 'Tidak ada dompet',
      noWalletsDesc1: 'Tidak ada dompet untuk ditampilkan.',
      noWalletsDesc2: 'untuk menambahkan dompet pertama Anda.',
      send: 'Kirim koin',
      receive: 'Terima koin',
      noTransactions: 'Tidak ada transaksi untuk ditampilkan.'
    },
    walletModal: { btcv: 'BTCV', wallets: 'Dompet' },
    importWallet: {
      title: 'Impor dompet Anda',
      header: 'Impor dompet',
      subtitle: 'Tuliskan di sini mnemonik, kunci privat, WIF, atau apa pun yang Anda punya. GoldWallet akan berusaha sebaik mungkin untuk menebak format yang tepat dan mengimpor dompet Anda.',
      placeholder: 'Mnemonik, kunci pribadi, WIF',
      import: 'Impor',
      scanQrCode: 'atau pindai kode QR',
      walletInUseValidationError: 'Dompet sudah digunakan. Masukkan dompet yang valid.'
    },
    exportWallet: { title: 'Frasa mnemonik', header: 'Ekspor dompet' },
    exportWalletXpub: { header: 'Dompet XPUB' },
    deleteWallet: {
      title: 'Hapus dompet Anda',
      header: 'Hapus dompet',
      description1: 'Anda yakin ingin menghapus',
      description2: '? Anda tidak dapat mengurungkannya.',
      no: 'Tidak',
      yes: 'Ya'
    },
    wallet: { none: 'Tidak ada', latest: 'Transaksi terakhir' },
    add: {
      title: 'Tambah dompet baru',
      subtitle: 'Namai dompet Anda',
      description: 'Masukkan nama untuk dompet baru Anda.',
      inputLabel: 'Nama',
      addWalletButton: 'Tambah dompet baru',
      importWalletButton: 'Impor dompet',
      advancedOptions: 'Opsi lanjutan',
      multipleAddresses: 'Beberapa alamat',
      singleAddress: 'Satu alamat',
      segwidAddress: 'Alamat ini mengandung sebuah pohon dari alamat segwit native, yang dihasilkan oleh sebuah benih tunggal 24-kata'
    },
    addSuccess: {
      title: 'Tambah dompet baru',
      subtitle: 'Berhasil',
      description: 'Dompet Anda telah dibuat. Luangkan waktu sebentar untuk menulis frasa mnemonik ini di selembar kertas. Untuk berjaga-jaga. Anda dapat menggunakannya untuk memulihkan dompet di perangkat lain.',
      okButton: 'Oke, saya sudah menuliskannya!'
    },
    details: {
      latestTransaction: 'Transaksi terakhir',
      typeLabel: 'Tipe',
      nameLabel: 'Nama',
      exportWallet: 'Ekspor dompet',
      showWalletXPUB: 'Tampilkan Dompet XPUB',
      deleteWallet: 'Hapus dompet',
      nameEdit: 'Edit nama'
    },
    export: { title: 'ekspor dompet' },
    import: {
      title: 'impor',
      explanation: 'Tuliskan di sini mnemonik, kunci privat, WIF, atau apa pun yang Anda punya. GoldWallet akan berusaha sebaik mungkin untuk menebak format yang tepat dan mengimpor dompet Anda',
      imported: 'Diimpor',
      error: 'Gagal mengimpor. Harap pastikan data yang diberikan valid.',
      success: 'Berhasil',
      do_import: 'Impor',
      scan_qr: 'atau pindai kode QR?'
    },
    scanQrWif: {
      go_back: 'Kembali',
      cancel: 'Batal',
      decoding: 'Mendekode',
      input_password: 'Masukkan kata sandi',
      password_explain: 'Ini adalah kunci privat terenkripsi BIP38',
      bad_password: 'Kata sandi buruk',
      wallet_already_exists: 'Dompet tersebut sudah ada',
      bad_wif: 'WIF buruk',
      imported_wif: 'WIF diimpor',
      with_address: 'dengan alamat',
      imported_segwit: 'SegWit diimpor',
      imported_legacy: 'Legacy diimpor',
      imported_watchonly: 'Watch-only diimpor'
    }
  },
  transactions: {
    list: { conf: 'Konfirmasi' },
    details: {
      title: 'Transaksi',
      detailTitle: 'Detail transaksi',
      transactionHex: 'Hex transaksi',
      transactionHexDescription: 'Ini adalah hex transaksi, ditandatangani dan siap disiarkan ke jaringan',
      copyAndBoriadcast: 'Salin dan siarkan nanti',
      verify: 'Verifikasi di coinb.in',
      amount: 'Jumlah',
      fee: 'Biaya',
      txSize: 'Ukuran TX',
      satoshiPerByte: 'Satoshi per byte',
      from: 'Dari',
      to: 'Ke',
      bytes: 'byte',
      copy: 'Salin',
      noLabel: 'Tidak ada label',
      details: 'Detail',
      transactionId: 'ID Transaksi',
      confirmations: 'konfirmasi',
      transactionDetails: 'Detail transaksi',
      viewInBlockRxplorer: 'Lihat di block explorer',
      addNote: 'Tambah catatan',
      note: 'Catatan',
      inputs: 'Input',
      ouputs: 'Output',
      sendCoins: 'Kirim koin'
    }
  },
  send: {
    header: 'Kirim koin',
    success: {
      title: 'Berhasil',
      description: 'Hore! Anda berhasil menyelesaikan transaksi.',
      done: 'Selesai',
      return: 'Kembali ke Dasbor'
    },
    details: {
      title: 'buat transaksi',
      amount_field_is_not_valid: 'Bidang jumlah tidak valid',
      fee_field_is_not_valid: 'Bidang biaya tidak valid',
      address_field_is_not_valid: 'Bidang alamat tidak valid',
      create_tx_error: 'Ada kesalahan saat membuat transaksi. Harap pastikan alamat valid.',
      address: 'alamat',
      amount_placeholder: 'jumlah yang dikirimkan (dalam BTCV)',
      fee_placeholder: 'plus biaya transaksi (dalam BTCV)',
      note_placeholder: 'catatan untuk diri sendiri',
      cancel: 'Batal',
      scan: 'Pindai',
      send: 'Kirim',
      next: 'Berikutnya',
      to: 'ke',
      feeUnit: 'Sat/B',
      fee: 'Biaya:',
      create: 'Buat Faktur',
      remaining_balance: 'Sisa saldo',
      total_exceeds_balance: 'Jumlah pengiriman melebihi sisa saldo.'
    },
    confirm: { sendNow: 'Kirim sekarang' },
    create: {
      amount: 'Jumlah',
      fee: 'Biaya',
      setTransactionFee: 'Atur biaya transaksi',
      headerText: 'Jika ada sejumlah besar transaksi tertunda di jaringan (>1500), biaya lebih tinggi akan membuat transaksi Anda diproses lebih cepat. Nilai biasanya adalah 1-500 sat/b'
    }
  },
  receive: {
    header: 'Terima koin',
    details: {
      amount: 'Jumlah',
      share: 'Bagikan',
      receiveWithAmount: 'Terima dengan jumlah'
    }
  },
  settings: {
    language: 'Bahasa',
    general: 'Umum',
    security: 'Keamanan',
    about: 'Tentang',
    electrumServer: 'Server Electrum',
    advancedOptions: 'Opsi lanjutan',
    changePin: 'Ubah PIN',
    fingerprintLogin: 'Login sidik jari',
    aboutUs: 'Tentang kami',
    header: 'Pengaturan',
    notSupportedFingerPrint: 'Perangkat anda tidak mendukung pemindai sidik jari',
    TouchID: 'Ijinkan penggunaan sidik jari',
    FaceID: 'Ijinkan penggunaan FaceID',
    Biometrics: 'Ijinkan penggunaan biometrik'
  },
  aboutUs: {
    header: 'Tentang kami',
    releaseNotes: 'Catatan rilis',
    runSelfTest: 'Jalankan tes mandiri',
    buildWithAwesome: 'Bangun dengan hebat:',
    rateGoldWallet: 'Beri peringkat GoldWallet',
    goToOurGithub: 'Masuk ke Github kami',
    alwaysBackupYourKeys: 'Selalu cadangkan kunci Anda',
    title: 'GoldWallet adalah dompet Bitcoin Vault gratis dan sumber terbuka. Dilisensi MIT.'
  },
  electrumServer: {
    header: 'Server Electrum',
    title: 'Ubah server electrum',
    description: 'Anda dapat merubah alamat server yang akan digunakan aplikasi Anda untuk menyambungkan diri. Alamat default direkomendasikan.',
    save: 'Simpan',
    useDefault: 'Gunakan default',
    host: 'host',
    port: 'port',
    successfullSave: 'Perubahan Anda berhasil disimpan. Mungkin dibutuhkan pemulaian ulang agar perubahan berlaku.',
    connectionError: 'Tidak dapat terhubung ke server Electrum yang tersedia'
  },
  advancedOptions: {
    title: 'Konfigurasikan opsi lanjutan',
    description: 'Mengaktifkan opsi Lanjutan akan memungkinkan Anda untuk memilih dari jenis dompet yang tercantum di bawah ini:\n' +
      'P2SH, HD P2SH, HD segwit.'
  },
  selectLanguage: {
    header: 'Bahasa',
    restartInfo: 'Saat memilih bahasa baru, mungkin dibutuhkan pemulaian ulang GoldWallet agar perubahan berlaku',
    confirmation: 'Konfirmasi',
    confirm: 'Konfirmasi',
    alertDescription: 'Pilih bahasa dan mulai ulang aplikasi?',
    cancel: 'Batal'
  },
  contactList: {
    cancel: 'Batal',
    search: 'Cari',
    bottomNavigationLabel: 'Buku alamat',
    screenTitle: 'Buku alamat',
    noContacts: 'Tidak ada kontak',
    noContactsDesc1: 'Tidak ada kontak untuk ditampilkan. \nKlik',
    noContactsDesc2: 'untuk menambahkan kontak pertama Anda.',
    noResults: 'Tidak ada hasil untuk'
  },
  contactCreate: {
    screenTitle: 'Tambah kontak baru',
    subtitle: 'Kontak baru',
    description: 'Masukkan nama dan alamat\nuntuk kontak baru Anda.',
    nameLabel: 'Nama',
    addressLabel: 'Alamat',
    buttonLabel: 'Tambah kontak baru',
    successTitle: 'Berhasil',
    successDescription: 'Hore! Anda telah berhasil\nmenambahkan kontak.',
    successButton: 'Kembali ke Buku alamat'
  },
  contactDetails: {
    nameLabel: 'Nama',
    addressLabel: 'Alamat',
    editName: 'Edit nama',
    editAddress: 'Edit alamat',
    sendCoinsButton: 'Kirim koin',
    showQRCodeButton: 'Tampilkan kode QR',
    deleteButton: 'Hapus kontak',
    share: 'Bagikan'
  },
  contactDelete: {
    title: 'Hapus kontak Anda',
    header: 'Hapus kontak',
    description1: 'Anda yakin ingin menghapus',
    description2: '?\nAnda tidak dapat mengurungkannya.',
    no: 'Tidak',
    yes: 'Ya',
    success: 'Berhasil',
    successDescription: 'Kontak Anda berhasil dihapus.\n' +
      'Anda sekarang dapat kembali ke Buku alamat.',
    successButton: 'Kembali ke Buku alamat'
  },
  scanQrCode: {
    permissionTitle: 'Izin untuk menggunakan kamera',
    permissionMessage: 'Kami membutuhkan izin Anda untuk menggunakan kamera',
    ok: 'Ok',
    cancel: 'Batal'
  }
}
