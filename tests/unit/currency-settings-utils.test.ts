import { createAmountInputNumberFormat } from '../../components/AmountInput.utils';
import { FiatUnit } from '../../models/fiatUnit';
import { createCurrencySettingsPreview } from '../../screen/settings/Currency.utils';

const createFormat = (decimalSeparator: string, groupingSeparator: string, locale = 'en-US') =>
  createAmountInputNumberFormat(
    { decimalSeparator, groupingSeparator },
    new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 }),
  );

describe('currency settings preview', () => {
  it('uses the supplied native separators while keeping Bitcoin formatting fixed', () => {
    const preview = createCurrencySettingsPreview({
      currency: FiatUnit.USD,
      fractionDigits: 2,
      numberFormat: createFormat(',', '.'),
      rawRate: 50000,
    });

    expect(preview).toEqual({
      bitcoinAmount: '1',
      bitcoinInFiat: '$50.000',
      fiatAmount: '$1.234,56',
      fiatInBitcoin: '0.0246912',
      satoshisAmount: '100,000',
      satoshisInFiat: '$50',
    });
  });

  it('uses the selected currency precision for conversions in both directions', () => {
    const preview = createCurrencySettingsPreview({
      currency: FiatUnit.JPY,
      fractionDigits: 0,
      numberFormat: createFormat('.', ','),
      rawRate: 10000000,
    });

    expect(preview).toEqual({
      bitcoinAmount: '1',
      bitcoinInFiat: '¥10,000,000',
      fiatAmount: '¥1,235',
      fiatInBitcoin: '0.00012346',
      satoshisAmount: '100,000',
      satoshisInFiat: '¥10,000',
    });
  });

  it('supports native numerals without changing BTC or sats standards', () => {
    const preview = createCurrencySettingsPreview({
      currency: FiatUnit.AED,
      fractionDigits: 2,
      numberFormat: createFormat('٫', '٬', 'ar-EG'),
      rawRate: 50000,
    });

    expect(preview).toMatchInlineSnapshot(`
      {
        "bitcoinAmount": "1",
        "bitcoinInFiat": "د.إ.٥٠٬٠٠٠",
        "fiatAmount": "د.إ.١٬٢٣٤٫٥٦",
        "fiatInBitcoin": "0.0246912",
        "satoshisAmount": "100,000",
        "satoshisInFiat": "د.إ.٥٠",
      }
    `);
  });

  it.each([undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])('omits conversions for an unusable rate of %s', rawRate => {
    expect(
      createCurrencySettingsPreview({
        currency: FiatUnit.USD,
        fractionDigits: 2,
        numberFormat: createFormat('.', ','),
        rawRate,
      }),
    ).toEqual({
      bitcoinAmount: '1',
      fiatAmount: '$1,234.56',
      satoshisAmount: '100,000',
    });
  });

  it('rounds three-decimal currencies without adding insignificant zeroes', () => {
    expect(
      createCurrencySettingsPreview({
        currency: FiatUnit.KWD,
        fractionDigits: 3,
        numberFormat: createFormat(',', '.'),
        rawRate: 40000.1239,
      }),
    ).toMatchObject({
      bitcoinInFiat: 'د.ك.40.000,124',
      fiatAmount: 'د.ك.1.234,56',
      satoshisInFiat: 'د.ك.40',
    });
  });
});
