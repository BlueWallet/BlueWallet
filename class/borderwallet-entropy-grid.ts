// implemented based on https://github.com/microchad/borderwallets/releases/latest/download/borderwallets.html
import * as bip39 from 'bip39';

export const getShuffledEntropyWords = function (seed: string): string[] {
  function Mash(): any {
    let n = 0xefc8249d;
    const mash = function (data: any) {
      if (data) {
        data = data.toString();
        for (let i = 0; i < data.length; i++) {
          n += data.charCodeAt(i);
          let h = 0.02519603282416938 * n;
          n = h >>> 0; // eslint-disable-line no-bitwise
          h -= n;
          h *= n;
          n = h >>> 0; // eslint-disable-line no-bitwise
          h -= n;
          n += h * 0x100000000;
          // 2^32
        }
        return (n >>> 0) * 2.3283064365386963e-10; // eslint-disable-line no-bitwise
        // 2^-32
      } else n = 0xefc8249d;
    };
    return mash;
  }

  function uheprng() {
    return (function () {
      const o = 48;
      let c = 1;
      let p = o;
      const s = new Array(o);
      let mash = Mash();
      function rawprng() {
        if (++p >= o) p = 0;
        const t = 1768863 * s[p] + c * 2.3283064365386963e-10;
        return (s[p] = t - (c = t | 0)); // eslint-disable-line no-bitwise
      }
      const random = function (range = 2) {
        return Math.floor(range * (rawprng() + ((rawprng() * 0x200000) | 0) * 1.1102230246251565e-16)); // eslint-disable-line no-bitwise
      };
      random.cleanString = function (inStr = '') {
        inStr = inStr.replace(/(^\s*)|(\s*$)/gi, '');
        inStr = inStr.replace(/[\x00-\x1F]/gi, ''); // eslint-disable-line no-control-regex
        inStr = inStr.replace(/\n /, '\n');
        return inStr;
      };
      random.hashString = function (inStr = '') {
        inStr = random.cleanString(inStr);
        mash(inStr);
        for (let i = 0; i < inStr.length; i++) {
          const k = inStr.charCodeAt(i);
          for (let j = 0; j < o; j++) {
            s[j] -= mash(k);
            if (s[j] < 0) s[j] += 1;
          }
        }
      };
      random.initState = function () {
        mash();
        for (let i = 0; i < o; i++) s[i] = mash(' ');
        c = 1;
        p = o;
      };
      random.done = function () {
        mash = null;
      };
      random.initState();
      return random;
    })();
  }

  const words = [...bip39.wordlists[bip39.getDefaultWordlist()]];

  // shuffle
  const prng = uheprng();
  prng.initState();
  prng.hashString(seed);
  for (let i = words.length - 1; i > 0; i--) {
    const j = prng(i + 1);
    [words[i], words[j]] = [words[j], words[i]];
  }
  prng.done();

  return words;
};
