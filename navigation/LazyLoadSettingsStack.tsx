import React, { lazy, Suspense } from 'react';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const Currency = lazy(() => import('../screen/settings/Currency'));
const Language = lazy(() => import('../screen/settings/Language'));
const SettingsBlockExplorer = lazy(() => import('../screen/settings/SettingsBlockExplorer'));
const Settings = lazy(() => import('../screen/settings/Settings'));
const GeneralSettings = lazy(() => import('../screen/settings/GeneralSettings'));
const Licensing = lazy(() => import('../screen/settings/Licensing'));
const NetworkSettings = lazy(() => import('../screen/settings/NetworkSettings'));
const About = lazy(() => import('../screen/settings/About'));
const DefaultView = lazy(() => import('../screen/settings/DefaultView'));
const ElectrumSettings = lazy(() => import('../screen/settings/ElectrumSettings'));
const EncryptStorage = lazy(() => import('../screen/settings/EncryptStorage'));
const LightningSettings = lazy(() => import('../screen/settings/LightningSettings'));
const NotificationSettings = lazy(() => import('../screen/settings/NotificationSettings'));
const SelfTest = lazy(() => import('../screen/settings/SelfTest'));
const ReleaseNotes = lazy(() => import('../screen/settings/ReleaseNotes'));
const Tools = lazy(() => import('../screen/settings/tools'));
const SettingsPrivacy = lazy(() => import('../screen/settings/SettingsPrivacy'));
const PlausibleDeniability = lazy(() => import('../screen/PlausibleDeniability'));

const withSuspense =
  <P extends object>(Component: React.ComponentType<P>) =>
  (props: P) => (
    <Suspense fallback={<LazyLoadingIndicator />}>
      <Component {...props} />
    </Suspense>
  );

export const CurrencyComponent = withSuspense(Currency);
export const LanguageComponent = withSuspense(Language);
export const BlockExplorerSettingsComponent = withSuspense(SettingsBlockExplorer);
export const SettingsComponent = withSuspense(Settings);
export const GeneralSettingsComponent = withSuspense(GeneralSettings);
export const LicensingComponent = withSuspense(Licensing);
export const NetworkSettingsComponent = withSuspense(NetworkSettings);
export const AboutComponent = withSuspense(About);
export const DefaultViewComponent = withSuspense(DefaultView);
export const ElectrumSettingsComponent = withSuspense(ElectrumSettings);
export const EncryptStorageComponent = withSuspense(EncryptStorage);
export const LightningSettingsComponent = withSuspense(LightningSettings);
export const NotificationSettingsComponent = withSuspense(NotificationSettings);
export const SelfTestComponent = withSuspense(SelfTest);
export const ReleaseNotesComponent = withSuspense(ReleaseNotes);
export const ToolsComponent = withSuspense(Tools);
export const SettingsPrivacyComponent = withSuspense(SettingsPrivacy);
export const PlausibleDeniabilityComponent = withSuspense(PlausibleDeniability);
