import { AppStorage } from './class';
import { Accelerometer } from 'expo';
import { AsyncStorage } from 'react-native';
const bitcoin = require('bitcoinjs-lib');
const REQUIRE_NUM_CHUNKS = 16;

// 256 priv key = 32 bytes x 8 chunks
// each chunk needs 32 bits of entropy (since ISAAC is 32 bit)
// 8 * 32 = 256 bits of entropy for one private key
// we read accelerometer 10 times per sec, getting 2 bits of entropy => 20 bits of entropy per sec
// 256/20 = 13 sec of gathering entropy

let chunks = []; // array of 32bit ints
let currenChunk = ''; // temp storage of bits (string)
let runningListeners = 0;

let listener = function(accelerometerData) {
  let hex = bitcoin.crypto.sha256(accelerometerData.x + '\t' + accelerometerData.y + '\t' + accelerometerData.z).toString('hex'); // whitening
  let dec = parseInt('0x' + hex[0] + hex[1]);
  let entropyBits = dec & 0b11;

  currenChunk += ((entropyBits < 2 && '0') || '') + entropyBits.toString(2); // always 2-char string

  if (currenChunk.length === 32) {
    // got enough bits for 32bit int
    console.log(currenChunk, parseInt(currenChunk, 2));
    chunks.push(currenChunk);
    chunks.push(parseInt(currenChunk, 2));
    currenChunk = '';
  }

  if (chunks.length >= REQUIRE_NUM_CHUNKS) {
    console.log('got enough entropy, saving to storage');
    Accelerometer.removeAllListeners();
    runningListeners--;
    AsyncStorage.setItem(AppStorage.ENTROPY, JSON.stringify(chunks));
  }
};

async function start() {
  let entropy = await AsyncStorage.getItem(AppStorage.ENTROPY);
  try {
    entropy = JSON.parse(entropy);
  } catch (Err) {
    entropy = [];
  }
  chunks = entropy || [];
  console.log('got', chunks.length * 32, 'bits of entropy');

  setInterval(() => {
    if (chunks.length < REQUIRE_NUM_CHUNKS && runningListeners === 0) {
      console.log('not enough entropy, starting listener to gather');
      Accelerometer.addListener(listener);
      runningListeners++;
    }
  }, 1000);
}

function gotEnoughEntropy() {
  return chunks.length >= 8; // enough for at least one priv key
}

function get32bitInt() {
  return chunks.pop();
}

module.exports.get32bitInt = get32bitInt;
module.exports.start = start;
module.exports.gotEnoughEntropy = gotEnoughEntropy;
