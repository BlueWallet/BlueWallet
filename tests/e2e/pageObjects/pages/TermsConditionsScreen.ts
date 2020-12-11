import { by, element } from 'detox';

import actions from '../../actions';

const TermsConditionsScreen = () => ({
  termsConditions: element(by.id('terms-conditions-screen')),

  disagreeButton: element(by.id('disagree-button')),
  agreeButton: element(by.id('agree-button')),
  popup: {
    noButton: element(by.id('')),
    yesButton: element(by.id('')),
  },

  async scrollDown() {
    await actions.waitForElement(this.termsConditions);
    await this.termsConditions.scrollTo('bottom');
  },

  async tapOnAgreeButton() {
    await actions.tap(this.agreeButton);
  },
});

export default TermsConditionsScreen;
