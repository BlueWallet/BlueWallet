export class CreatePin {
  public readonly elements = {
    input: element(by.id('create-pin')),
  };

  public async type(pin: string): Promise<void> {
    await waitFor(this.elements.input)
      .toBeVisible()
      .withTimeout(10000);
    await this.elements.input.typeText(pin);
  }
}

const createPin = new CreatePin();

export default createPin;
