export const MODAL_TYPES = {
  ENTER_PASSWORD: 'ENTER_PASSWORD',
  CREATE_PASSWORD: 'CREATE_PASSWORD',
  CREATE_FAKE_STORAGE: 'CREATE_FAKE_STORAGE',
  SUCCESS: 'SUCCESS',
} as const;

export type ModalType = (typeof MODAL_TYPES)[keyof typeof MODAL_TYPES];

export type PromptPasswordConfirmationParams = {
  modalType: ModalType;
  returnTo: 'PlausibleDeniability' | 'EncryptStorage';
};

export type PasswordSheetResult = {
  status: 'success' | 'failure' | 'cancel';
  password?: string;
  modalType: ModalType;
};
