import config from 'app/../config';

import { images } from 'app/assets';

export const logoSource = config.isBeta ? images.goldWalletLogoBlackBeta : images.goldWalletLogoBlack;
