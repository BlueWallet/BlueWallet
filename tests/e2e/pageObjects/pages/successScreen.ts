export class SuccessScreen {
  public readonly elements = {
    close: element(by.id('close-button')),
  };

  public async isLoaded(): Promise<boolean> {
    await waitFor(this.elements.close)
      .toBeVisible()
      .withTimeout(10000);

    return true;
  }

  public async close(): Promise<void> {
    await waitFor(this.elements.close)
      .toBeVisible()
      .withTimeout(10000);
    await this.elements.close.tap();
  }
}

const successScreen = new SuccessScreen();

export default successScreen;
