export class BetaVersionScreen {
  public readonly elements = {
    closeButton: element(by.id('close-beta-version-screen')),
  };

  public async close(): Promise<void> {
    await waitFor(this.elements.closeButton)
      .toBeVisible()
      .withTimeout(10000);
    await this.elements.closeButton.tap();
  }
}
const betaVersionScreen = new BetaVersionScreen();

export default betaVersionScreen;
