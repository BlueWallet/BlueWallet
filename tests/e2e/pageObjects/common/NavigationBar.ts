import { by, element } from 'detox';

import actions from '../../actions';

type Tab = 'wallets' | 'authenticators' | 'address book' | 'settings';

const NavigationBar = () => ({
  tabs: {
    wallets: element(by.id('navigation-tab-0')),
    authenticators: element(by.id('navigation-tab-1')),
    'address book': element(by.id('navigation-tab-2')),
    settings: element(by.id('navigation-tab-3')),
  },

  async changeTab(tab: Tab): Promise<void> {
    await actions.tap(this.tabs[tab]);
  },
});

export default NavigationBar;
