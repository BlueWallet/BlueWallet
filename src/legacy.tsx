/* eslint-disable @typescript-eslint/no-var-requires */

// re-export from old app source code
// add type annotations or explicitly cast to any type to make them TS compatible

import { defaultPeer } from '../BlueElectrum';
import { AppStorage, HDSegwitBech32Wallet, HDSegwitP2SHWallet, SegwitP2SHWallet } from '../class';
import Biometric from '../class/biometrics';

// ES6 syntax doesn't work here
const BlueApp: any = require('../BlueApp');
const EV: any = require('../events');

export { BlueApp, AppStorage, HDSegwitBech32Wallet, HDSegwitP2SHWallet, SegwitP2SHWallet, EV, Biometric, defaultPeer };
