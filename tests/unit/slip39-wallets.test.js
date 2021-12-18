import assert from 'assert';

import { SLIP39LegacyP2PKHWallet, SLIP39SegwitP2SHWallet, SLIP39SegwitBech32Wallet } from '../../class';

global.crypto = require('crypto');

describe('SLIP39 wallets tests', () => {
  it('can validateMnemonic', async () => {
    const w = new SLIP39LegacyP2PKHWallet();
    // not enought shares
    w.setSecret(
      'shadow pistol academic always adequate wildlife fancy gross oasis cylinder mustang wrist rescue view short owner flip making coding armed',
    );
    assert.strictEqual(w.validateMnemonic(), false);

    // wrong words
    w.setSecret('qweasd ewqasd');
    assert.strictEqual(w.validateMnemonic(), false);
  });

  it('can generate ID', () => {
    const w = new SLIP39LegacyP2PKHWallet();
    // not enought shares
    w.setSecret(
      'shadow pistol academic always adequate wildlife fancy gross oasis cylinder mustang wrist rescue view short owner flip making coding armed',
    );

    assert.ok(w.getID());
  });

  it('SLIP39LegacyP2PKHWallet can generate addresses', async () => {
    const w = new SLIP39LegacyP2PKHWallet();
    // 4. Basic sharing 2-of-3 (128 bits)
    w.setSecret(
      'shadow pistol academic always adequate wildlife fancy gross oasis cylinder mustang wrist rescue view short owner flip making coding armed\n' +
        'shadow pistol academic acid actress prayer class unknown daughter sweater depict flip twice unkind craft early superior advocate guest smoking',
    );

    assert.ok(w.validateMnemonic());
    assert.strictEqual(w._getExternalAddressByIndex(0), '18pvMjy7AJbCDtv4TLYbGPbR7SzGzjqUpj');
    assert.strictEqual(w._getExternalAddressByIndex(1), '1LDm2yFgHesgVjENC4cEpvUnW5HdYp51gX');
    assert.strictEqual(w._getInternalAddressByIndex(0), '1EeW2xsK52vqBpsFLYa1vL6hyxmWCsK3Nx');
    assert.strictEqual(w._getInternalAddressByIndex(1), '1EM8ADickQ9WppVgSGGgjL8PGWhbbTqNpW');
  });

  it('SLIP39LegacyP2PKHWallet can work with truncated words', async () => {
    const w = new SLIP39LegacyP2PKHWallet();
    // 4. Basic sharing 2-of-3 (128 bits)
    w.setSecret(
      'SHAD PIS ACAD ALWA ADEQ WILD FANC GROS OASI CYLI MUST WRIS RESC VIEW SHOR OWNER FLIP MAKI CODI ARME\n' +
        'SHAD PIS ACAD ACI ACTR PRAY CLAS UNKN DAUG SWEA DEPI FLI TWIC UNKI CRAF EARL SUPE ADVO GUES SMOK',
    );

    assert.ok(w.validateMnemonic());
    assert.strictEqual(w._getExternalAddressByIndex(0), '18pvMjy7AJbCDtv4TLYbGPbR7SzGzjqUpj');
  });

  it('SLIP39SegwitP2SHWallet can generate addresses', async () => {
    const w = new SLIP39SegwitP2SHWallet();
    // 23. Basic sharing 2-of-3 (256 bits)
    w.setSecret(
      'humidity disease academic always aluminum jewelry energy woman receiver strategy amuse duckling lying evidence network walnut tactics forget hairy rebound impulse brother survive clothes stadium mailman rival ocean reward venture always armed unwrap\n' +
        'humidity disease academic agency actress jacket gross physics cylinder solution fake mortgage benefit public busy prepare sharp friar change work slow purchase ruler again tricycle involve viral wireless mixture anatomy desert cargo upgrade',
    );

    assert.ok(w.validateMnemonic());
    assert.strictEqual(w._getExternalAddressByIndex(0), '3G3HrQ7DrNJLm8gMrLHTeeD5DdzgeoScRJ');
    assert.strictEqual(w._getExternalAddressByIndex(1), '3HgGV4fhXz8GZYVMRT1tj9WoUdMQMDrGvw');
    assert.strictEqual(w._getInternalAddressByIndex(0), '3BdrAbZCo9BCmzP1nmpEVyGXMB9JF4MJ1L');
    assert.strictEqual(w._getInternalAddressByIndex(1), '3GFSjHbSRGZZavmY7YTm9UJfDbmJdpCeMA');
  });

  it('SLIP39SegwitBech32Wallet can generate addresses', async () => {
    const w = new SLIP39SegwitBech32Wallet();
    // 36. Threshold number of groups and members in each group (256 bits, case 1)
    w.setSecret(
      'wildlife deal ceramic round aluminum pitch goat racism employer miracle percent math decision episode dramatic editor lily prospect program scene rebuild display sympathy have single mustang junction relate often chemical society wits estate\n' +
        'wildlife deal decision scared acne fatal snake paces obtain election dryer dominant romp tactics railroad marvel trust helpful flip peanut theory theater photo luck install entrance taxi step oven network dictate intimate listen\n' +
        'wildlife deal ceramic scatter argue equip vampire together ruin reject literary rival distance aquatic agency teammate rebound false argue miracle stay again blessing peaceful unknown cover beard acid island language debris industry idle\n' +
        'wildlife deal ceramic snake agree voter main lecture axis kitchen physics arcade velvet spine idea scroll promise platform firm sharp patrol divorce ancestor fantasy forbid goat ajar believe swimming cowboy symbolic plastic spelling\n' +
        'wildlife deal decision shadow analysis adjust bulb skunk muscle mandate obesity total guitar coal gravity carve slim jacket ruin rebuild ancestor numerous hour mortgage require herd maiden public ceiling pecan pickup shadow club\n',
    );

    assert.ok(w.validateMnemonic());
    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qkchjws74hkuhamxk0qa280xc68643nu32pde20');
    assert.strictEqual(w._getExternalAddressByIndex(1), 'bc1qrslzpjwl7ksdxvealdq0qulgspey62vr3acwnp');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qgx35amln8aryyr0lw6j2729l3gemzjftp5xrne');
    assert.strictEqual(w._getInternalAddressByIndex(1), 'bc1q48v0hcuz2jjsls628wj8jtn7rqp8wsyz2gxdxm');
  });

  // tests below are from https://github.com/spesmilo/electrum/pull/6917/files#diff-2940d8023ed102277f9c8b91135a9d6fa90fd2752b7b6147c1b5911f26db6d7fR497
  it('SLIP39LegacyP2PKHWallet can use passphrase', async () => {
    const w = new SLIP39LegacyP2PKHWallet();
    w.setSecret(
      'extra extend academic bishop cricket bundle tofu goat apart victim enlarge program behavior permit course armed jerky faint language modern\n' +
        'extra extend academic acne away best indicate impact square oasis prospect painting voting guest either argue username racism enemy eclipse\n' +
        'extra extend academic arcade born dive legal hush gross briefing talent drug much home firefly toxic analysis idea umbrella slice',
    );
    w.setPassphrase('TREZOR');

    assert.strictEqual(
      w.getXpub(),
      'xpub6CDgeTHt97zmW24XoYdjH9PVFMUj6qcYAe9SZXMKRKJbvTNeZhutNkQqajLyZrQ9DCqdnGenKhBD6UTrT1nHnoLCfFHkdeX8hDsZx1je6b2',
    );

    assert.strictEqual(w._getExternalAddressByIndex(0), '1NomKAUNnbASwbPuGHmkSVmnrJS5tZeVce');
    assert.strictEqual(w._getInternalAddressByIndex(0), '1Aw4wpXsAyEHSgMZqPdyewoAtJqH9Jaso3');
    assert.strictEqual(w._getExternalWIFByIndex(0), 'L55ZfXJgyXNPFrFtq2eqnwAkrjrarkKdmbkTEWxYXd2srXcfj3KF');
  });

  it('SLIP39SegwitP2SHWallet can use passphrase', async () => {
    const w = new SLIP39SegwitP2SHWallet();
    w.setSecret(
      'hobo romp academic axis august founder knife legal recover alien expect emphasis loan kitchen involve teacher capture rebuild trial numb spider forward ladle lying voter typical security quantity hawk legs idle leaves gasoline\n' +
        'hobo romp academic agency ancestor industry argue sister scene midst graduate profile numb paid headset airport daisy flame express scene usual welcome quick silent downtown oral critical step remove says rhythm venture aunt',
    );
    w.setPassphrase('TREZOR');

    assert.strictEqual(
      w.getXpub(),
      'ypub6Y6aCjkcjCP2y7jZStTevc8Tj3GjoXncqC4ReMzdVZWScB68vKZSZBZ88ENvuPUXXBBR58JXkuz1UrwLnCFvnFTUEpzu5yQabeYBRyd7Edf',
    );

    assert.strictEqual(w._getExternalAddressByIndex(0), '3GCgNoWWVqVdhBxWxrnWQHgwLtffGSYn7D');
    assert.strictEqual(w._getInternalAddressByIndex(0), '3FVvdRhR7racZhmcvrGAqX9eJoP8Sw3ypp');
  });

  it('SLIP39SegwitBech32Wallet can use passphrase', async () => {
    const w = new SLIP39SegwitBech32Wallet();
    w.setSecret(
      'eraser senior beard romp adorn nuclear spill corner cradle style ancient family general leader ambition exchange unusual garlic promise voice\n' +
        'eraser senior ceramic snake clay various huge numb argue hesitate auction category timber browser greatest hanger petition script leaf pickup\n' +
        'eraser senior ceramic shaft dynamic become junior wrist silver peasant force math alto coal amazing segment yelp velvet image paces\n' +
        'eraser senior ceramic round column hawk trust auction smug shame alive greatest sheriff living perfect corner chest sled fumes adequate',
    );
    w.setPassphrase('TREZOR');

    assert.strictEqual(
      w.getXpub(),
      'zpub6rs6bFckxdWVHBucVX129aNAYqiwPwh1HgsWt6HEQBa9F9QBKRcYzsw7WZR7rPSCWKmRVTUaEgrGrHStx2LSTpbgAEerbnrh4XxkRXbUUZF',
    );

    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qaggygkqgqjjpt58zrmhvjz5m9dj8mjshw0lpgu');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1q8l6hcvlczu4mtjcnlwhczw7vdxnvwccpjl3cwz');
  });
});
