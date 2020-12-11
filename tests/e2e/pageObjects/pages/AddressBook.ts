import { by, element } from 'detox';

import actions from '../../actions';
import DeleteScreen from '../common/DeleteScreen';
import MessageScreen from '../common/MessageScreen';

const AddressBook = () => {
  const ContactsScreen = () => ({
    noContactsIcon: element(by.id('no-contacts-icon')),
    createButton: element(by.id('create-contact-button')),
    searchbar: element(by.id('contacts-searchbar')),
    noContactsFoundIcon: element(by.id('no-contacts-found-icon')),
    searchbarClearButton: element(by.id('searchbar-clear-button')),

    getContactElement(name: string) {
      return element(by.id(`contact-${name}`));
    },

    async tapOnContact(name: string) {
      const contact = this.getContactElement(name);

      await actions.tap(contact);
    },

    async tapOnCreateButton() {
      await actions.tap(this.createButton);
    },

    async typeInSearchbar(value: string) {
      await actions.typeText(this.searchbar, value);
    },

    async clearSearchbar() {
      await actions.tap(this.searchbarClearButton);
    },
  });

  const NewContact = () => {
    const AddNewContactScreen = () => ({
      nameInput: element(by.id('new-contact-name-input')),
      nameValidationError: element(by.id('new-contact-name-input-validation-error')),
      addressInput: element(by.id('new-contact-address-input')),
      addressValidationError: element(by.id('new-contact-address-input-validation-error')),
      scanQrCodeButton: element(by.id('new-contact-qr-code-button')),
      submitButton: element(by.id('new-contact-submit-button')),

      async typeName(value: string) {
        await actions.typeText(this.nameInput, value, { closeKeyboard: true });
      },

      async typeAddress(value: string) {
        await actions.typeText(this.addressInput, value, { closeKeyboard: false });
      },

      async submit() {
        await actions.tap(this.submitButton);
      },

      async tapOnScanQrCodeButton() {
        await actions.tap(this.scanQrCodeButton);
      },
    });

    return {
      addNewContactScreen: AddNewContactScreen(),
      successScreen: MessageScreen('success'),
    };
  };

  const Details = () => {
    const DetailsScreen = () => ({
      scrollView: element(by.id('contact-details-screen')),

      nameInput: element(by.id('edit-contact-name-input')),
      addressInput: element(by.id('edit-contact-address-input')),
      copyAddressButton: element(by.id('copy-contact-address-button')),
      sendCoinsButton: element(by.id('contact-details-send-coins-button')),
      showQrCodeButton: element(by.id('contact-details-show-qr-code-button')),
      deleteButton: element(by.id('contact-delete-button')),

      async changeName(value: string) {
        await actions.typeText(this.nameInput, value, { replace: true });
      },

      async changeAddress(value: string) {
        await actions.typeText(this.addressInput, value, { replace: true });
      },

      async tapOnCopyAddressButton() {
        await actions.tap(this.copyAddressButton);
      },

      async tapOnSendCoinsButton() {
        await actions.tap(this.sendCoinsButton);
      },

      async tapOnShowQrCodeButton() {
        await actions.tap(this.showQrCodeButton);
      },

      async tapOnDeleteButton() {
        await this.scrollView.scrollTo('bottom');
        await actions.tap(this.deleteButton);
      },
    });

    const QrCodeScreen = () => ({
      qrCode: element(by.id('share-contact-qr-code')),
      shareButton: element(by.id('share-contact-qr-code-button')),

      async tapOnShareButton() {
        await actions.tap(this.shareButton);
      },
    });

    return {
      detailsScreen: DetailsScreen(),
      qrCodeScreen: QrCodeScreen(),
      deleteScreen: DeleteScreen(),
      deleteSuccessScreen: MessageScreen('success'),
    };
  };

  const contactsScreen = ContactsScreen();
  const newContact = NewContact();
  const details = Details();

  const createNewContact = async function(name: string, address: string) {
    await contactsScreen.tapOnCreateButton();
    await newContact.addNewContactScreen.typeName(`${name}\n`);
    await newContact.addNewContactScreen.typeAddress(address);
    await newContact.addNewContactScreen.submit();
    await newContact.successScreen.close();
  };

  return {
    contactsScreen,
    newContact,
    details,
    createNewContact,
  };
};

export default AddressBook;
