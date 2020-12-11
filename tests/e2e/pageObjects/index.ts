import NavigationBar from './common/NavigationBar';
import AddressBook from './pages/AddressBook';
import Authenticators from './pages/Authenticators';
import BetaVersionScreen from './pages/BetaVersionScreen';
import Onboarding from './pages/Onboarding';
import TermsConditionsScreen from './pages/TermsConditionsScreen';
import Wallets from './pages/Wallets';

const app = {
  betaVersionScreen: BetaVersionScreen(),
  onboarding: Onboarding(),
  wallets: Wallets(),
  authenticators: Authenticators(),
  addressBook: AddressBook(),
  navigationBar: NavigationBar(),
  termsConditionsScreen: TermsConditionsScreen(),
};

export default app;
