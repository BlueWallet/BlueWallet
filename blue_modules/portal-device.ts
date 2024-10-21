import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { PortalSdk, type NfcOut, type CardStatus } from 'libportal-react-native';
import assert from 'assert';

let sdk: PortalSdk | null = null;
let keepReading = false;
let alreadyInited = false;
let livenessCheckInterval: NodeJS.Timeout;

function livenessCheck(): Promise<NfcOut> {
  return new Promise((_resolve, reject) => {
    livenessCheckInterval = setInterval(() => {
      NfcManager.nfcAHandler.transceive([0x30, 0xed]).catch(() => {
        NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 });
        clearInterval(livenessCheckInterval);

        reject(new Error('Removed tag'));
      });
    }, 250);
  });
}

async function manageTag() {
  assert(sdk, 'sdk is null');
  await sdk.newTag();
  const check = livenessCheck();

  // eslint-disable-next-line no-unmodified-loop-condition
  while (keepReading && sdk) {
    const msg = await Promise.race([sdk.poll(), check]);
    // console.trace('>', msg.data);
    const result = await NfcManager.nfcAHandler.transceive(msg.data);
    // console.trace('<', result);
    await sdk.incomingData(msg.msgIndex, result);
    // await new Promise(resolve => setTimeout(resolve, 100)); // chance for UI to propagate
  }
}

async function listenForTags() {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (keepReading) {
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
  }
}

export const init = () => {
  if (alreadyInited) return;

  return NfcManager.isSupported().then(value => {
    if (value) {
      console.log('NFC read starting...');
      NfcManager.start().then(() => {
        alreadyInited = true;
      });
    } else {
      throw new Error('NFC not supported');
    }
  });
};

export const startReading = async () => {
  if (keepReading) return; // protect from double calls

  if (!alreadyInited) {
    await init();
  }

  sdk = new PortalSdk(true);
  keepReading = true;
  listenForTags();
};

export const stopReading = () => {
  assert(sdk, 'sdk is null');
  keepReading = false;

  sdk.destroy();
  sdk = null;

  return NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 });
};

export const getStatus = async (): Promise<CardStatus> => {
  assert(sdk, 'sdk is null');
  return sdk.getStatus();
};

export const unlock = async (pass: string) => {
  assert(sdk, 'sdk is null');
  return sdk.unlock(pass);
};

export const publicDescriptors = async () => {
  assert(sdk, 'sdk is null');
  return sdk.publicDescriptors();
};

export const isReading = () => {
  return keepReading;
};
