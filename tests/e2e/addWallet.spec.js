/* global it, describe, expect, element, by */

describe('BlueWallet UI Tests', () => {
  it('Shows Wallets List screen', async () => {
    await expect(element(by.id('WalletsList'))).toBeVisible();
  });

  it('Shows Wallets List screen', async () => {
    await expect(element(by.id('WalletsList'))).toBeVisible();
  });
});
