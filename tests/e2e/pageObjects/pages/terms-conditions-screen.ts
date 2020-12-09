import { by, element, waitFor } from 'detox';

export class TermsConditionsScreen {
  private terms = element(by.id('terms-conditions-screen'));

  public readonly elements = {
    disagreeButton: element(by.id('disagree-button')),
    agreeButton: element(by.id('agree-button')),
    popup: {
      noButton: element(by.id('')),
      yesButton: element(by.id('')),
    },
  };

  public async scrollDown() {
    await waitFor(this.terms)
      .toBeVisible()
      .withTimeout(10000);

    await this.terms.scrollTo('bottom');
  }

  public async tapOnAgreeButton() {
    await waitFor(this.terms)
      .toBeVisible()
      .withTimeout(10000);

    await this.elements.agreeButton.tap();
  }
}

const termsConditionScreen = new TermsConditionsScreen();

export default termsConditionScreen;
