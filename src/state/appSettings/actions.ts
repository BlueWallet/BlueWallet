export enum AppSettingsAction {
  UpdateBiometricSetting = 'UpdateBiometricSetting',
  UpdateAdvancedOptions = 'UpdateAdvancedOptions',
  UpdateSelectedLanguage = 'UpdateSelectedLanguage',
}

export interface UpdateBiometricSettingAction {
  type: AppSettingsAction.UpdateBiometricSetting;
  value: boolean;
}

export interface UpdateAdvancedOptionsAction {
  type: AppSettingsAction.UpdateAdvancedOptions;
  value: boolean;
}

export interface UpdateSelectedLanguageAction {
  type: AppSettingsAction.UpdateSelectedLanguage;
  value: string;
}

export type AppSettingsActionType =
  | UpdateBiometricSettingAction
  | UpdateAdvancedOptionsAction
  | UpdateSelectedLanguageAction;

export const updateBiometricSetting = (value: boolean): UpdateBiometricSettingAction => ({
  type: AppSettingsAction.UpdateBiometricSetting,
  value,
});

export const updateAdvancedOptions = (value: boolean): UpdateAdvancedOptionsAction => ({
  type: AppSettingsAction.UpdateAdvancedOptions,
  value,
});

export const updateSelectedLanguage = (value: string): UpdateSelectedLanguageAction => ({
  type: AppSettingsAction.UpdateSelectedLanguage,
  value,
});
