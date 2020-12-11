import { expect } from 'detox';

import { isBeta } from '../helpers';
import app from '../pageObjects';

describe('Authenticators', () => {
  beforeEach(async () => {
    isBeta() && (await app.onboarding.betaVersionScreen.close());
    await app.termsConditionsScreen.scrollDown();
    await app.termsConditionsScreen.tapOnAgreeButton();
    await app.onboarding.passThrough('1111', 'qwertyui');
    await app.navigationBar.changeTab('authenticators');
  });

  describe('Dashboard', () => {
    describe('@android @ios @smoke', () => {
      it('should display empty list if there is no authenticators added', async () => {
        await expect(app.authenticators.dashboardScreen.noAuthenticatorsIcon).toBeVisible();
      });
    });

    describe('@android @ios @regression', () => {
      it('should be possible to display details of an authenticator', async () => {
        await app.authenticators.createAuthenticator('My Auth');

        await app.authenticators.dashboardScreen.tapOnAuthenticator('My Auth');
        await expect(app.authenticators.details.detailsScreen.nameInput).toBeVisible();
      });
    });
  });

  describe('Adding authenticator', () => {
    describe('@android @ios @smoke', () => {
      it('should be possible to create a new authenticator', async () => {
        await app.authenticators.dashboardScreen.tapOnAddButton();

        await app.authenticators.addNewAuthenticator.createScreen.typeName('My Auth');
        await app.authenticators.addNewAuthenticator.createScreen.submit();
        await app.authenticators.addNewAuthenticator.publicKeyScreen.proceed();
        await app.authenticators.addNewAuthenticator.loadingScreen.waitUntilEnded();
        await app.authenticators.addNewAuthenticator.seedPhraseScreen.proceed();
      });
    });

    describe('@android @ios @regression', () => {
      it('should be possible to import an authenticator using seed phrases', async () => {
        await app.authenticators.dashboardScreen.tapOnAddButton();

        await app.authenticators.addNewAuthenticator.createScreen.tapOnImportButton();
        await app.authenticators.addNewAuthenticator.importScreen.typeName('Imported Auth\n');
        await app.authenticators.addNewAuthenticator.importScreen.typeSeedPhrase(
          'basket cup man arena crazy gift escape drift merge salute sock elegant',
        );
        await app.authenticators.addNewAuthenticator.importScreen.submit();
        await expect(app.authenticators.addNewAuthenticator.importSuccessScreen.icon).toBeVisible();
      });

      xit('should be possible to import an authenticator using QR code', async () => {});

      it("shouldn't be possible to create a new authenticator with non-unique name", async () => {
        await app.authenticators.createAuthenticator('My Auth');

        await app.authenticators.dashboardScreen.tapOnAddButton();
        await app.authenticators.addNewAuthenticator.createScreen.typeName('My Auth');
        await expect(app.authenticators.addNewAuthenticator.createScreen.nameValidationError).toBeVisible();
      });

      it("shouldn't be possible to import a new authenticator with non-unique name", async () => {
        await app.authenticators.createAuthenticator('My Auth');

        await app.authenticators.dashboardScreen.tapOnAddButton();
        await app.authenticators.addNewAuthenticator.createScreen.tapOnImportButton();
        await app.authenticators.addNewAuthenticator.importScreen.typeName('My Auth');
        await expect(app.authenticators.addNewAuthenticator.importScreen.nameValidationError).toBeVisible();
      });

      it("shouldn't be possible to import a new authenticator if seed phrase is invalid", async () => {
        await app.authenticators.createAuthenticator('My Auth');

        await app.authenticators.dashboardScreen.tapOnAddButton();
        await app.authenticators.addNewAuthenticator.createScreen.tapOnImportButton();
        await app.authenticators.addNewAuthenticator.importScreen.typeSeedPhrase('foo bar baz\n');
        await expect(app.authenticators.addNewAuthenticator.importScreen.seedPhraseValidationError).toBeVisible();
      });
    });
  });

  describe('Details', () => {
    describe('@android @ios @smoke', () => {
      it('should be possible to check details of an authenticator', async () => {
        await app.authenticators.createAuthenticator('My Auth');

        await app.authenticators.dashboardScreen.tapOnAuthenticator('My Auth');
        await expect(app.authenticators.details.detailsScreen.nameInput).toBeVisible();
      });
    });

    describe('@android @ios @regression', () => {
      it('should be possible to rename an authenticator', async () => {
        await app.authenticators.createAuthenticator('My Auth');

        await app.authenticators.dashboardScreen.tapOnAuthenticator('My Auth');
        await app.authenticators.details.detailsScreen.changeName('Goofy Auth\n');
        await expect(app.authenticators.details.detailsScreen.authenticatorName).toHaveText('Goofy Auth');
      });

      it('should be possible to delete an authenticator', async () => {
        await app.authenticators.createAuthenticator('My Auth');

        await app.authenticators.dashboardScreen.tapOnAuthenticator('My Auth');
        await app.authenticators.details.detailsScreen.scrollView.scrollTo('bottom');
        await app.authenticators.details.detailsScreen.tapOnDeleteButton();
        await app.authenticators.details.deleteScreen.confirm();
        await app.authenticators.details.deleteSuccessScreen.close();
        await expect(app.authenticators.dashboardScreen.noAuthenticatorsIcon).toBeVisible();
      });
    });
  });
});
