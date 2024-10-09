import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { PortalSdk, type NfcOut, type CardStatus } from 'libportal-react-native';

const sdk = new PortalSdk(true);
let keepReading = false;
let alreadyInited = false;
let livenessCheckInterval: NodeJS.Timeout;

function livenessCheck(): Promise<NfcOut> {
  return new Promise((_resolve, reject) => {
    livenessCheckInterval = setInterval(() => {
      NfcManager.getTag()
        .then(() => NfcManager.transceive([0x30, 0xed]))
        .catch(() => {
          NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 });
          clearInterval(livenessCheckInterval);

          reject(new Error('Removed tag'));
        });
    }, 250);
  });
}

async function manageTag() {
  await sdk.newTag();
  const check = livenessCheck();

  // eslint-disable-next-line no-unmodified-loop-condition
  while (keepReading) {
    const msg = await Promise.race([sdk.poll(), check]);
    // console.trace('>', msg.data);
    const result = await NfcManager.nfcAHandler.transceive(msg.data);
    // console.trace('<', result);
    await sdk.incomingData(msg.msgIndex, result);
    // await new Promise(resolve => setTimeout(resolve, 100)); // chance for UI to propagate
  }
}

async function listenForTags() {
  // while (keepReading) {
  console.info('Looking for a Portal...');

  try {
    await NfcManager.registerTagEvent();
    await NfcManager.requestTechnology(NfcTech.NfcA, {});
    await manageTag();
  } catch (ex) {
    console.warn('Oops!', ex);
  } finally {
    await NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 });
  }

  // await new Promise(resolve => setTimeout(resolve, 100)); // chance for UI to propagate
  // }
}

export const init = () => {
  if (alreadyInited) return;

  return NfcManager.isSupported().then(value => {
    if (value) {
      console.log('NFC read starting...');
      alreadyInited = true;
      keepReading = true;
      NfcManager.start().then(listenForTags);
    } else {
      throw new Error('NFC not supported');
    }
  });
};

export const startReading = () => {
  if (!alreadyInited) return init();

  if (keepReading) return; // protect from double calls

  keepReading = true;
  return listenForTags();
};

export const stopReading = () => {
  keepReading = false;
  clearTimeout(livenessCheckInterval);
  // return NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 });
};

export const getStatus = async (): Promise<CardStatus> => {
  if (!keepReading) throw new Error('getStatus(): not reading');

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 2_000);

    sdk.getStatus().then((result: CardStatus) => {
      clearTimeout(timeout);
      resolve(result);
    });
  });
};

export const unlock = async (pass: string) => {
  return sdk.unlock(pass);
};

export const publicDescriptors = async () => {
  return sdk.publicDescriptors();
};

export const isReading = () => {
  return keepReading;
};
