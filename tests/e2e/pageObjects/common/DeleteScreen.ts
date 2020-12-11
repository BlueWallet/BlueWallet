import { by, element } from 'detox';

import actions from '../../actions';

const DeleteScreen = () => ({
  yesButton: element(by.id('confirm-button')),
  noButton: element(by.id('cancel-button')),

  async confirm() {
    await actions.tap(this.yesButton);
  },

  async cancel() {
    await actions.tap(this.noButton);
  },
});

export default DeleteScreen;
