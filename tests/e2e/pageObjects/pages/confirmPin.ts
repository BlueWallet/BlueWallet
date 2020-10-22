export class ConfirmPin {
  public readonly elements = {
    input: element(by.id('confirm-pin')),
    errorMessage: element(by.id('invalid-pin-message')),
  };

  public async type(pin: string): Promise<void> {
    await waitFor(this.elements.input)
      .toBeVisible()
      .withTimeout(10000);
    await this.elements.input.typeText(pin);
  }
}

const confirmPin = new ConfirmPin();

export default confirmPin;
