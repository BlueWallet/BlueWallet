import { by, element } from 'detox';

import actions from '../../actions';

const BetaVersionScreen = () => ({
  closeButton: element(by.id('close-beta-version-screen')),

  async close() {
    await actions.tap(this.closeButton);
  },
});

export default BetaVersionScreen;
