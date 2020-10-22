export class CreatePassword {
  public readonly elements = {
    input: element(by.id('create-transaction-password')),
    submit: element(by.id('submit-create-transaction-password')),
  };

  public async type(pin: string): Promise<void> {
    // TODO: Extract the timeout value to external module
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

const createPassword = new CreatePassword();

export default createPassword;
