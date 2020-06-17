const getLocales = () => [
  // you can choose / add the locales you want
  { countryCode: 'US', languageTag: 'en-US', languageCode: 'en', isRTL: false },
  { countryCode: 'FR', languageTag: 'fr-FR', languageCode: 'fr', isRTL: false },
];
const getCurrencies = () => ['USD', 'EUR']; // can be empty array

export { getLocales, getCurrencies };
