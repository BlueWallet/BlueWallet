import { expect, waitFor } from 'detox';

import { expectToBeDisabled } from '../assertions';
import app from '../pageObjects';

describe('Terms & Conditions', () => {
  describe('@android @ios @smoke', () => {
    it('should be possible to accept Terms & Conditions and proceed', async () => {
      await app.termsConditionsScreen.scrollDown();
      await app.termsConditionsScreen.tapOnAgreeButton();
    });
  });

  describe('@android @ios @regression', () => {
    it("shouldn't be possible to accept Terms & Conditions before scrolled to bottom", async () => {
      await expectToBeDisabled(app.termsConditionsScreen.agreeButton);
    });

    xit('should close the app once clicked confirm button on "Are you sure?" pop-up', async () => {});

    xit('should close the pop-up once clicked decline button on "Are you sure?" pop-up', async () => {});
  });
});
