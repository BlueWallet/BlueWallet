import { ConfirmDetailsButton, ExportTransactionButton } from '../../navigation/helpers/SendTransactionHeaderButtons';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { writeFileAndExport } from '../../blue_modules/fs';

jest.mock('../../components/themes', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('../../components/Icon', () => 'Icon');
jest.mock('../../hooks/useBiometrics', () => ({ useBiometrics: jest.fn(), unlockWithBiometrics: jest.fn() }));
jest.mock('../../blue_modules/fs', () => ({ writeFileAndExport: jest.fn() }));

const params = {
  fee: 0.00001234,
  recipients: [{ address: 'recipient', value: 50000 }],
  memo: 'memo',
  tx: 'transaction',
  satoshiPerByte: 3,
};

beforeEach(() => jest.clearAllMocks());

it('does not open transaction details when biometrics are cancelled', async () => {
  useBiometrics.mockReturnValue({ isBiometricUseCapableAndEnabled: async () => true });
  unlockWithBiometrics.mockResolvedValue(false);
  const navigation = { navigate: jest.fn() };
  await ConfirmDetailsButton({ params, navigation }).props.onPress();
  expect(unlockWithBiometrics).toHaveBeenCalledTimes(1);
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it.each([true, false])('opens the current transaction with biometrics enabled=%s', async enabled => {
  useBiometrics.mockReturnValue({ isBiometricUseCapableAndEnabled: async () => enabled });
  unlockWithBiometrics.mockResolvedValue(true);
  const navigation = { navigate: jest.fn() };
  await ConfirmDetailsButton({ params, navigation }).props.onPress();
  expect(unlockWithBiometrics).toHaveBeenCalledTimes(enabled ? 1 : 0);
  expect(navigation.navigate).toHaveBeenCalledWith('CreateTransaction', { ...params, feeSatoshi: 1234 });
});

it('exports the transaction supplied by the stack', async () => {
  await ExportTransactionButton({ tx: 'current-transaction' }).props.onPress();
  expect(writeFileAndExport).toHaveBeenCalledWith(expect.stringMatching(/^\d+\.txn$/), 'current-transaction', false);
});
