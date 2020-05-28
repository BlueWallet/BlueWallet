module.exports = {
  _: {
    storage_is_encrypted: 'O seu armazenamento está encriptado. A palavra-passe é necessária para desencriptá-lo',
    enter_password: 'Introduzir palavra-passe',
    bad_password: 'Palavra-passe incorrecta, tente novamente',
    never: 'nunca',
    continue: 'Continuar',
    ok: 'OK'
  },
  message: {
    somethingWentWrong: 'Alguma coisa correu mal',
    somethingWentWrongWhileCreatingWallet: 'Alguma coisa correu mal enquanto criava a sua carteira. Volte ao Painel e tente novamente.',
    success: 'Sucesso',
    successfullWalletImport: 'A importação da sua carteira foi realizada com sucesso. Pode voltar ao Painel.',
    successfullWalletDelete: 'A sua carteira foi excluída com sucesso. Pode voltar ao Painel.',
    returnToDashboard: 'Voltar ao Painel',
    creatingWallet: 'Criação da sua carteira',
    creatingWalletDescription: 'Estamos a criar a sua carteira. Este procedimento pode demorar um pouco. Agradecemos a sua compreensão.'
  },
  onboarding: {
    onboarding: 'Definir credenciais',
    pin: 'PIN',
    createPin: 'Definir PIN',
    createNewPin: 'Novo PIN',
    createPassword: 'Criar palavra-passe de transacção',
    createPinDescription: 'O seu PIN será utilizado para iniciar sessão na aplicação. Poderá alterá-lo posteriormente no menu Definições.',
    confirmPin: 'Confirmar PIN',
    confirmNewPin: 'Confirmar novo PIN',
    confirmPassword: 'Confirmar palavra-passe de transacção',
    passwordDoesNotMatch: 'As palavras-passe não correspondem. Por favor, introduza uma palavra-passe válida.',
    createPasswordDescription: 'A palavra-passe de transacção será utilizada para verificar todas as suas transacções. Informamos de que esta palavra-passe não pode ser alterada. A palavra-passe de transacção deve conter pelo menos 8 caracteres alfanuméricos.',
    changePin: 'Alterar PIN',
    currentPin: 'PIN actual',
    pinDoesNotMatch: 'O PIN introduzido não corresponde. Por favor, introduza um PIN válido',
    successDescription: 'Parabéns! \nDefiniu com sucesso o seu código PIN.',
    successDescriptionChangedPin: 'Parabéns! \nAlterou com sucesso o seu código PIN.',
    successButton: 'Ir ao Menu Principal',
    successButtonChangedPin: 'Voltar ao menu Definições'
  },
  unlock: {
    title: 'Desbloquear',
    touchID: 'Touch ID para "Gold Wallet"',
    confirmButton: 'Introduza a sua impressão digital para continuar.',
    enter: 'Introduza o PIN'
  },
  unlockTransaction: {
    headerText: 'Confirmar transacção',
    title: 'Confirmar palavra-passe de transacção',
    description: 'Confirme a palavra-passe de transacção para proceder com a transacção'
  },
  wallets: {
    dashboard: {
      title: 'Carteiras',
      noWallets: 'Sem carteiras',
      noWalletsDesc1: 'Nenhuma carteira para apresentar.',
      noWalletsDesc2: 'adicionar a sua primeira carteira.',
      send: 'Enviar moedas',
      receive: 'Receber moedas',
      noTransactions: 'Nenhuma transacção para apresentar.'
    },
    walletModal: { btcv: 'BTCV', wallets: 'Carteiras' },
    importWallet: {
      title: 'Importar a sua carteira',
      header: 'Importar carteira',
      subtitle: 'Anote aqui a sua mnemónica, chave privada, WIF ou o que tiver. GoldWallet fará o melhor para descobrir o formato correto e importar a sua carteira',
      placeholder: 'Mnemónica, chave privada, WIF',
      import: 'Importar',
      scanQrCode: 'ou analisar o código de QR',
      walletInUseValidationError: 'Essa carteira já está a ser usada. Introduza uma carteira válida.'
    },
    exportWallet: { title: 'Frase da mnemónica', header: 'Exportar carteira' },
    exportWalletXpub: { header: 'Carteira XPUB' },
    deleteWallet: {
      title: 'Excluir a sua carteira',
      header: 'Excluir carteira',
      description1: 'Tem certeza de que deseja excluir',
      description2: '? Não pode anular esta acção.',
      no: 'Não',
      yes: 'Sim'
    },
    wallet: { none: 'Nenhum', latest: 'Transacção mais recente' },
    add: {
      title: 'Adicionar nova carteira',
      subtitle: 'Nome da sua carteira',
      description: 'Introduza um nome para a sua nova carteira.',
      inputLabel: 'Nome',
      addWalletButton: 'Adicionar nova carteira',
      importWalletButton: 'Importar carteira',
      advancedOptions: 'Opções avançadas',
      multipleAddresses: 'Múltiplos endereços',
      singleAddress: 'Um endereço',
      segwidAddress: 'Contém uma árvore de endereços de segmento nativos, gerados a partir de uma única semente de 24 palavras'
    },
    addSuccess: {
      title: 'Adicionar nova carteira',
      subtitle: 'Sucesso',
      description: 'A sua carteira foi criada. Tire um momento para anotar esta frase da mnemónica num papel. É a sua cópia de segurança. Pode usá-la para repor a carteira noutros dispositivos.',
      okButton: 'OK, anotei-a!'
    },
    details: {
      latestTransaction: 'Transacção mais recente',
      typeLabel: 'Tipo',
      nameLabel: 'Nome',
      exportWallet: 'Exportar carteira',
      showWalletXPUB: 'Apresentar carteira XPUB',
      deleteWallet: 'Excluir carteira',
      nameEdit: 'Editar nome'
    },
    export: { title: 'exportar carteira' },
    import: {
      title: 'Importar',
      explanation: 'Anote aqui a sua mnemónica, chave privada, WIF ou o que tiver. GoldWallet fará o melhor para descobrir o formato correto e importar a sua carteira',
      imported: 'Importada',
      error: 'Falha na importação. Garanta que os dados fornecidos são válidos.',
      success: 'Sucesso',
      do_import: 'Importar',
      scan_qr: 'ou analisar o código de QR?'
    },
    scanQrWif: {
      go_back: 'Voltar',
      cancel: 'Cancelar',
      decoding: 'Descodificação',
      input_password: 'Introduzir palavra-passe',
      password_explain: 'Esta é a chave privada encriptada BIP38',
      bad_password: 'Palavra-passe incorrecta',
      wallet_already_exists: 'Essa carteira já existe',
      bad_wif: 'WIF errada',
      imported_wif: 'WIF importada',
      with_address: 'com endereço',
      imported_segwit: 'SegWit importado',
      imported_legacy: 'Legacy importado',
      imported_watchonly: 'Ver apenas importado'
    }
  },
  transactions: {
    list: { conf: 'Confirmações' },
    details: {
      title: 'Transacção',
      detailTitle: 'Detalhes da transacção',
      transactionHex: 'Transacção hexagonal',
      transactionHexDescription: 'Esta é uma transacção hexagonal, assinada e preparada para transmitir à rede',
      copyAndBoriadcast: 'Copiar e transmitir mais tarde',
      verify: 'Verificar em coinb.in',
      amount: 'Montante',
      fee: 'Taxa',
      txSize: 'Tamanho de TX',
      satoshiPerByte: 'Satoshi por byte',
      from: 'De',
      to: 'Para',
      bytes: 'bytes',
      copy: 'Copiar',
      noLabel: 'Sem etiqueta',
      details: 'Detalhes',
      transactionId: 'ID da Transação',
      confirmations: 'confirmações',
      transactionDetails: 'Detalhes da transação',
      viewInBlockRxplorer: 'Ver no explorador de blocos',
      addNote: 'Adicionar nota',
      note: 'Nota',
      inputs: 'Entradas',
      ouputs: 'Saídas',
      sendCoins: 'Enviar moedas'
    }
  },
  send: {
    header: 'Enviar moedas',
    success: {
      title: 'Sucesso',
      description: 'Parabéns! Terminou a transacção com sucesso.',
      done: 'Pronto',
      return: 'Voltar ao Painel'
    },
    details: {
      title: 'criar transacção',
      amount_field_is_not_valid: 'O campo do montante não é válido',
      fee_field_is_not_valid: 'O campo da taxa não é válido',
      address_field_is_not_valid: 'O campo do endereço não é válido',
      create_tx_error: 'Houve um erro na criação da transacção. Garanta que o endereço é válido.',
      address: 'endereço',
      amount_placeholder: 'montante a enviar (em BTCV)',
      fee_placeholder: 'mais taxa da transacção (em BTCV)',
      note_placeholder: 'nota para si mesmo',
      cancel: 'Cancelar',
      scan: 'Analisar',
      send: 'Enviar',
      next: 'Seguinte',
      to: 'para',
      feeUnit: 'Sat/B',
      fee: 'Taxa:',
      create: 'Criar fatura',
      remaining_balance: 'Saldo remanescente',
      total_exceeds_balance: 'O montante a enviar excede o saldo disponível.'
    },
    confirm: { sendNow: 'Enviar agora' },
    create: {
      amount: 'Montante',
      fee: 'Taxa',
      setTransactionFee: 'Configurar uma taxa de transacção',
      headerText: 'Quando existe um grande número de transacções pendentes na rede (>1500), a taxa mais alta irá resultar no processamento mais rápido da sua transacção. Os valores normais são 1-500 sat/b'
    }
  },
  receive: {
    header: 'Receber moedas',
    details: {
      amount: 'Montante',
      share: 'Partilhar',
      receiveWithAmount: 'Receber com o montante'
    }
  },
  settings: {
    language: 'Idioma',
    general: 'Geral',
    security: 'Segurança',
    about: 'Sobre',
    electrumServer: 'Servidor Electrum',
    advancedOptions: 'Opções avançadas',
    changePin: 'Alterar PIN',
    fingerprintLogin: 'Iniciar sessão com impressão digital',
    aboutUs: 'Sobre nós',
    header: 'Definições',
    notSupportedFingerPrint: 'O seu dispositivo não suporta impressão digital',
    TouchID: 'Permitir impressão digital',
    FaceID: 'Permitir FaceID',
    Biometrics: 'Permitir dados biométricos'
  },
  aboutUs: {
    header: 'Sobre nós',
    releaseNotes: 'Notas de lançamento',
    runSelfTest: 'Executar teste próprio',
    buildWithAwesome: 'Construir com Awesome:',
    rateGoldWallet: 'Classificar GoldWallet',
    goToOurGithub: 'Ir para Github',
    alwaysBackupYourKeys: 'Realizar sempre uma cópia de segurança nas suas chaves',
    title: 'A Gold Wallet é grátis, tratando-se de uma carteira gratuita do Bitcoin Vault. Licenciada pelo MIT.'
  },
  electrumServer: {
    header: 'Servidor Electrum',
    title: 'Alterar o Servidor Electrum',
    description: 'Poderá alterar o endereço do servidor ao qual é efectuada a ligação. O endereço padrão é recomendado.',
    save: 'Guardar',
    useDefault: 'Usar predefinição',
    host: 'anfitrião',
    port: 'porta',
    successfullSave: 'As suas alterações foram guardadas com sucesso. A reinicialização pode ser exigida para que as alterações tenham efeito.',
    connectionError: 'Não está a ser possível efectuar a ligação ao servidor Electrum fornecido  '
  },
  advancedOptions: {
    title: 'Configurar opções avançadas',
    description: 'A activação das Opções Avançadas permitirá escolher entre os tipos de carteira listados abaixo: \n' +
      'P2SH, HD P2SH, HD segwit.'
  },
  selectLanguage: {
    header: 'Idioma',
    restartInfo: 'Quando um novo idioma é seleccionado, o reinício da aplicação GoldWallet pode ser exigido para esta alteração ter efeito',
    confirmation: 'Confirmação',
    confirm: 'Confirmar',
    alertDescription: 'Seleccionar o idioma e reiniciar a aplicação?',
    cancel: 'Cancelar'
  },
  contactList: {
    cancel: 'Cancelar',
    search: 'Pesquisar',
    bottomNavigationLabel: 'Lista de endereços',
    screenTitle: 'Lista de endereços',
    noContacts: 'Sem contactos',
    noContactsDesc1: 'Sem contactos para apresentar. \nClicar',
    noContactsDesc2: 'para adicionar o seu primeiro contacto.',
    noResults: 'Sem resultados para'
  },
  contactCreate: {
    screenTitle: 'Adicionar novo contacto',
    subtitle: 'Novo contacto',
    description: 'Introduza um nome e um endereço\npara o seu novo contacto.',
    nameLabel: 'Nome',
    addressLabel: 'Endereço',
    buttonLabel: 'Adicionar novo contacto',
    successTitle: 'Sucesso',
    successDescription: 'Parabéns! Adicionou o seu contacto\ncom sucesso.',
    successButton: 'Voltar à Lista de endereços'
  },
  contactDetails: {
    nameLabel: 'Nome',
    addressLabel: 'Endereço',
    editName: 'Editar nome',
    editAddress: 'Editar endereço',
    sendCoinsButton: 'Enviar moedas',
    showQRCodeButton: 'Apresentar Código QR',
    deleteButton: 'Eliminar contacto',
    share: 'Partilhar'
  },
  contactDelete: {
    title: 'Eliminar o seu contacto',
    header: 'Eliminar contacto',
    description1: 'Tem certeza de que deseja excluir',
    description2: '?\nNão pode anular esta ação.',
    no: 'Não',
    yes: 'Sim',
    success: 'Sucesso',
    successDescription: 'O seu contacto foi excluído com sucesso.\n' +
      'Pode voltar à Lista de endereços.',
    successButton: 'Voltar à Lista de endereços'
  },
  scanQrCode: {
    permissionTitle: 'Permissão para usar a câmara',
    permissionMessage: 'Precisamos da sua permissão para usar a sua câmara',
    ok: 'OK',
    cancel: 'Cancelar'
  }
}
