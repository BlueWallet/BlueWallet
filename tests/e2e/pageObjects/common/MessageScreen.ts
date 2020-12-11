import { by, element } from 'detox';

import actions from '../../actions';

export type MessageScreenType = 'success' | 'errorState' | 'processingState';

const MessageScreen = (type: MessageScreenType) => ({
  icon: element(by.id(`${type}-message`)),
  closeButton: element(by.id('message-close-button')),

  async close(): Promise<void> {
    await actions.tap(this.closeButton);
  },

  async waitUntilEnded(): Promise<void> {},
});

export default MessageScreen;
