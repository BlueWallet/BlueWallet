import { by, element } from 'detox';

import actions from '../../actions';

const ScanQrCodeScreen = () => ({
  customStringInput: element(by.id('custom-string-input')),
  submitButton: element(by.id('custom-string-submit-button')),

  async scanCustomString(data: string) {
    await actions.typeText(this.customStringInput, data);
    await actions.multiTap(this.submitButton, 2); // Note: For some reasons, it requires to be clicked twice
  },
});

export default ScanQrCodeScreen;
