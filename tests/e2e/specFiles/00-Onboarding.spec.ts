import { device, expect } from 'detox';

import app from '../pageObjects';

describe('Onboarding', () => {
  beforeEach(async () => {
    // TODO: With the first execution it re-launches the app unnecessarly. Fix it.
    await device.launchApp({ newInstance: true, delete: true });
  });

  describe('@android @ios @smoke', () => {
    it('should pass onboarding successfully if typed credentials are correct', async () => {
      await app.createPin.type('1111');
      await app.confirmPin.type('1111');

      await app.createPassword.type('qwertyui');
      await app.createPassword.submit();

      await app.confirmPassword.type('qwertyui');
      await app.confirmPassword.submit();

      // TODO: Make an assertion whether it is Success page for sure.
      await expect(app.successScreen.elements.close).toBeVisible();
    });
  });

  describe('@android @ios @regression', () => {
    it('should see an error message if typed PIN on confirmation page doesnt match', async () => {
      await app.createPin.type('1111');
      await app.confirmPin.type('2222');

      await expect(app.confirmPin.elements.errorMessage).toBeVisible();
    });

    it('should see an error message if typed transaction password on confirmation page doesnt match', async () => {
      await app.createPin.type('1111');
      await app.confirmPin.type('1111');

      await app.createPassword.type('qwertyui');
      await app.createPassword.submit();

      await app.confirmPassword.type('asdfghjk\n');
      await app.confirmPassword.submit();

      await expect(app.confirmPassword.elements.errorMessage).toBeVisible();
    });
  });
});
