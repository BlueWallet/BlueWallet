import { useLanguage } from '../components/Context/LanguageProvider';

/**
 * Hook that forces component re-render when language changes.
 * Use this in any component that directly uses `loc` for translations.
 * This is a convenience wrapper around useLanguage() for components
 * that only need to trigger re-renders without needing the language value.
 *
 * @example
 * const MyComponent = () => {
 *   useLocalization(); // Component will re-render on language change
 *   return <Text>{loc.settings.title}</Text>;
 * };
 */
export const useLocalization = () => {
  useLanguage();
};
