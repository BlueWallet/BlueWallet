import 'detox';

export class ConfirmPassword {
  public readonly elements = {
    input: element(by.id('confirm-transaction-password')),
    errorMessage: element(by.id('validation-error-message')),
    submit: element(by.id('submit-transaction-password-confirmation')),
  };

  public async type(pin: string): Promise<void> {
    await waitFor(this.elements.input)
      .toBeVisible()
      .withTimeout(10000);
    await this.elements.input.typeText(pin);
  }

  public async submit(): Promise<void> {
    await waitFor(this.elements.submit)
      .toBeVisible()
      .withTimeout(10000);
    await this.elements.submit.tap();
  }
}

const confirmPassword = new ConfirmPassword();

export default confirmPassword;
