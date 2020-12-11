import { expect, waitFor } from 'detox';

import { isBeta } from '../helpers';
import app from '../pageObjects';

describe('Onboarding', () => {
  beforeEach(async () => {
    await app.termsConditionsScreen.scrollDown();
    await app.termsConditionsScreen.tapOnAgreeButton();
  });

  describe('@android @ios @smoke', () => {
    it('should pass onboarding successfully if typed credentials are correct', async () => {
      isBeta() && (await app.onboarding.betaVersionScreen.close());

      await app.onboarding.createPinScreen.typePin('1111');
      await app.onboarding.confirmPinScreen.typePin('1111');

      await app.onboarding.createPasswordScreen.typePassword('qwertyui');
      await app.onboarding.createPasswordScreen.submit();

      await app.onboarding.confirmPasswordScreen.typePassword('qwertyui');
      await app.onboarding.confirmPasswordScreen.submit();

      await waitFor(app.onboarding.successScreen.icon)
        .toBeVisible()
        .withTimeout(20000);
    });
  });

  describe('@android @ios @regression', () => {
    it('should see an error message if typed PIN on confirmation page doesnt match', async () => {
      isBeta() && (await app.onboarding.betaVersionScreen.close());

      await app.onboarding.createPinScreen.typePin('1111');
      await app.onboarding.confirmPinScreen.typePin('2222');

      await expect(app.onboarding.confirmPinScreen.pinValidationError).toBeVisible();
    });

    it('should see an error message if typed transaction password on confirmation page doesnt match', async () => {
      isBeta() && (await app.onboarding.betaVersionScreen.close());

      await app.onboarding.createPinScreen.typePin('1111');
      await app.onboarding.confirmPinScreen.typePin('1111');

      await app.onboarding.createPasswordScreen.typePassword('qwertyui');
      await app.onboarding.createPasswordScreen.submit();

      await app.onboarding.confirmPasswordScreen.typePassword('asdfghjk\n');
      await app.onboarding.confirmPasswordScreen.submit();

      await expect(app.onboarding.confirmPasswordScreen.passwordValidationError).toBeVisible();
    });
  });
});
