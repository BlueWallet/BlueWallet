module.exports = {
  _: {
    storage_is_encrypted: '저장 공간이 암호화되었습니다. 암호를 해독하려면 비밀번호가 필요합니다',
    enter_password: '비밀번호를 입력하십시오',
    bad_password: '잘못된 비밀번호입니다. 다시 시도하십시오',
    never: '아니요',
    continue: '계속',
    ok: '확인'
  },
  message: {
    somethingWentWrong: '문제가 발생했습니다',
    somethingWentWrongWhileCreatingWallet: '지갑을 생성 중에 문제가 발생했습니다. 대시보드로 돌아가서 다시 시도하십시오.',
    success: '성공',
    successfullWalletImport: '지갑 가져오기에 성공했습니다. 이제 대시보드로 돌아갈 수 있습니다.',
    successfullWalletDelete: '지갑 삭제에 성공했습니다. 이제 대시보드로 돌아갈 수 있습니다.',
    returnToDashboard: '대시보드로 돌아가기',
    creatingWallet: '지갑 만들기',
    creatingWalletDescription: '지갑을 만드는 동안 기다려주십시오. 약간의 시간이 소요될 수 있습니다.'
  },
  wallets: {
    dashboard: {
      title: '지갑',
      noWallets: '지갑 없음',
      noWalletsDesc1: '표시할 지갑이 없습니다.',
      noWalletsDesc2: '첫 번째 지갑을 추가합니다.',
      send: '코인 보내기',
      receive: '코인 받기',
      noTransactions: '표시할 트랜잭션이 없습니다.'
    },
    walletModal: { btcv: 'BTCV', wallets: '지갑' },
    importWallet: {
      title: '귀하의 지갑 가져오기',
      header: '지갑 가져오기',
      subtitle: '연상 기호, 개인 키, WIF 또는 가지고 있는 것을 여기에 쓰십시오. 골드월렛(GoldWallet)은 올바른 형식을 추측하고 지갑을 가져오기 위해 최선을 다합니다.',
      placeholder: '연상 기호, 개인 키, WIF',
      import: '가져오기',
      scanQrCode: '또는 QR 코드 스캔하기',
      walletInUseValidationError: '지갑이 이미 사용 중입니다. 유효한 지갑을 입력하십시오.'
    },
    exportWallet: { title: '연상 기호 문구', header: '지갑 내보내기' },
    exportWalletXpub: { header: '지갑 XPUB' },
    deleteWallet: {
      title: '귀하의 지갑 삭제하기',
      header: '지갑 삭제하기',
      description1: '정말로 삭제하시겠습니까',
      description2: '? 추후 삭제를 취소할 수 없습니다.',
      no: '아니요',
      yes: '예'
    },
    wallet: { none: '없음', latest: '최신 트랜잭션' },
    add: {
      title: '새 지갑 추가',
      subtitle: '지갑 이름 짓기',
      description: '새 지갑의 이름을 입력하십시오.',
      inputLabel: '이름',
      addWalletButton: '새 지갑 추가',
      importWalletButton: '지갑 가져오기',
      advancedOptions: '고급 옵션',
      multipleAddresses: '여러 개의 주소',
      singleAddress: '단일 주소'
    },
    addSuccess: {
      title: '새 지갑 추가',
      subtitle: '성공',
      description: '새 지갑을 만들었습니다. 백업을 위해 이 연상 기호 문구를 종이에 적어두십시오. 이 문구를 사용하여 다른 장치에서 지갑을 복원할 수 있습니다.',
      okButton: '예, 적어두었습니다!'
    },
    details: {
      latestTransaction: '최신 트랜잭션',
      typeLabel: '유형',
      nameLabel: '이름',
      exportWallet: '지갑 내보내기',
      showWalletXPUB: '지갑 XPUB 표시하기',
      deleteWallet: '지갑 삭제하기',
      nameEdit: '이름 수정하기'
    },
    export: { title: '지갑 내보내기' },
    import: {
      title: '가져오기',
      explanation: '연상 기호, 개인 키, WIF 또는 가지고 있는 것을 여기에 쓰십시오. 골드월렛(GoldWallet)은 올바른 형식을 추측하고 지갑을 가져오기 위해 최선을 다합니다',
      imported: '가져오기',
      error: '가져오기에 실패했습니다. 제공한 데이터의 유효성을 확인하십시오.',
      success: '성공',
      do_import: '가져오기',
      scan_qr: '또는 대신에 QR 코드를 스캔하시겠습니까?'
    },
    scanQrWif: {
      go_back: '돌아가기',
      cancel: '취소',
      decoding: '디코딩',
      input_password: '비밀번호 입력',
      password_explain: '이것은 BIP38 암호화 개인 키입니다',
      bad_password: '잘못된 비밀번호',
      wallet_already_exists: '해당 지갑은 이미 존재합니다',
      bad_wif: '잘못된 WIF',
      imported_wif: '가져온 WIF',
      with_address: '주소로',
      imported_segwit: '가져온 SegWit',
      imported_legacy: '가져온 레거시',
      imported_watchonly: '가져온 워치 전용'
    }
  },
  transactions: {
    list: { conf: '확인' },
    details: {
      title: '트랜잭션',
      detailTitle: '트랜잭션 상세 내역',
      transactionHex: '트랜잭션 헥스(hex)',
      transactionHexDescription: '서명된 트랜잭션 헥스가 네트워트에 송출 준비가 되었습니다.',
      copyAndBoriadcast: '복사하여 나중에 송출하기',
      verify: 'Coinb.in에서 확인하기',
      amount: '금액',
      fee: '수수료',
      txSize: 'TX 크기',
      satoshiPerByte: '바이트당 사토시(Satoshi)',
      from: '발신',
      to: '수신',
      bytes: '바이트',
      copy: '복사',
      noLabel: '라벨 없음',
      details: '세부 사항',
      transactionId: '트랜잭션 ID',
      confirmations: '확인',
      transactionDetails: '트랜잭션 상세 내역',
      viewInBlockRxplorer: '블록 익스플로러(block explorer)에서 보기',
      addNote: '메모 추가하기',
      note: '메모',
      inputs: '입력',
      ouputs: '출력',
      sendCoins: '코인 보내기'
    }
  },
  send: {
    header: '코인 보내기',
    success: {
      title: '성공',
      description: '만세! 트랜잭션 완료에 성공했습니다.',
      done: '완료',
      return: '대시보드로 돌아가기'
    },
    details: {
      title: '트랜잭션 생성하기',
      amount_field_is_not_valid: '금액 입력창이 유효하지 않습니다',
      fee_field_is_not_valid: '수수료 입력창이 유효하지 않습니다',
      address_field_is_not_valid: '주소 입력창이 유효하지 않습니다',
      create_tx_error: '트랜잭션을 생성하는 중에 오류가 발생했습니다. 주소의 유효성 여부를 확인하십시오.',
      address: '주소',
      amount_placeholder: '보낼 금액(BTCV)',
      fee_placeholder: '추가 트랜잭션 수수료(BTCV)',
      note_placeholder: '자기 메모',
      cancel: '취소',
      scan: '스캔',
      send: '보내기',
      next: '다음',
      to: '수신',
      feeUnit: 'Sat/B',
      fee: '수수료:',
      create: '인보이스 생성하기',
      remaining_balance: '잔액',
      total_exceeds_balance: '송금할 금액이 사용 가능한 잔액을 초과합니다.'
    },
    confirm: { sendNow: '지금 보내기' },
    create: {
      amount: '금액',
      fee: '수수료',
      setTransactionFee: '트랜잭션 수수료 설정하기',
      headerText: '네트워크에 보류 중인 트랜잭션이 많을 때 (>1500), 수수료가 높을수록 트랜잭션이 더 빨리 처리됩니다. 일반적인 값은 1-500 sat/b입니다'
    }
  },
  receive: {
    header: '코인 받기',
    details: { amount: '금액', share: '공유', receiveWithAmount: '금액으로 받기' }
  },
  settings: {
    language: '언어',
    general: '일반',
    security: '보안',
    about: '소개',
    electrumServer: '일렉트럼(Electrum) 서버',
    advancedOptions: '고급 옵션',
    changePin: '핀(PIN) 변경',
    fingerprintLogin: '지문 로그인',
    aboutUs: '회사 소개',
    header: '설정'
  },
  aboutUs: {
    header: '회사 소개',
    releaseNotes: '릴리스 노트',
    runSelfTest: '자체 테스트 실행',
    buildWithAwesome: '멋진 빌드:',
    rateGoldWallet: '골드월렛(GoldWallet) 평가하기',
    goToOurGithub: '당사의 Github로 이동하기',
    alwaysBackupYourKeys: '항상 키를 백업하십시오',
    title: '골드월렛(GoldWallet)은 무료이며 오픈 소스인 비트코인 볼트(Bitcoin Vault) 지갑입니다. 허가받은 MIT.'
  },
  electrumServer: {
    header: '일렉트럼(Electrum) 서버',
    save: '저장하기',
    useDefault: '기본값 사용',
    host: '호스트',
    port: '포트',
    successfullSave: '변경 사항이 저장되었습니다. 변경 사항을 적용하려면 재시작이 필요할 수 있습니다.',
    connectionError: '제공된 일렉트럼(Electrum) 서버에 연결할 수 없습니다'
  },
  selectLanguage: {
    header: '언어',
    restartInfo: '새로운 언어를 선택할 때 변경 사항을 적용하려면 골드월렛(GoldWallet)을 다시 시작해야 할 수 있습니다',
    confirmation: '확인',
    confirm: '확인',
    alertDescription: '언어를 선택하고 애플리케이션을 다시 시작하시겠습니까?',
    cancel: '취소'
  },
  contactList: {
    cancel: '취소',
    search: '검색하기',
    bottomNavigationLabel: '주소록',
    screenTitle: '주소록',
    noContacts: '연락처 없음',
    noContactsDesc1: '표시할 연락처가 없습니다. \n클릭해서',
    noContactsDesc2: '첫 번째 연락처를 추가합니다',
    noResults: '다음에 관한 결과가 없습니다.'
  },
  contactCreate: {
    screenTitle: '새 연락처 추가하기',
    subtitle: '새 연락처',
    description: '새 연락처의 이름과\n주소를 입력하십시오.',
    nameLabel: '이름',
    addressLabel: '주소',
    buttonLabel: '새 연락처 추가하기',
    successTitle: '성공',
    successDescription: '만세! 새 연락처 추가에\n성공했습니다.',
    successButton: '주소록으로 돌아가기'
  },
  contactDetails: {
    nameLabel: '이름',
    addressLabel: '주소',
    editName: '이름 수정',
    editAddress: '주소 수정',
    sendCoinsButton: '코인 보내기',
    showQRCodeButton: 'QR 코드 표시하기',
    deleteButton: '연락처 삭제하기',
    share: '공유'
  },
  contactDelete: {
    title: '귀하의 연락처를 삭제하십시오',
    header: '연락처 삭제하기',
    description1: '삭제하시겠습니까',
    description2: '?\n추후 삭제를 취소할 수 없습니다.',
    no: '아니요',
    yes: '예',
    success: '성공',
    successDescription: '연락처 삭제에 성공했습니다.\n이제 주소록으로 돌아갈 수 있습니다.',
    successButton: '주소록으로 돌아가기'
  },
  scanQrCode: {
    permissionTitle: '카메라 사용 허용',
    permissionMessage: '귀하의 카메라 사용에 대한 허용이 필요합니다',
    ok: '확인',
    cancel: '취소'
  }
}
