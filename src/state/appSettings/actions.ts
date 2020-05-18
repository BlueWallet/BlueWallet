export enum AppSettingsAction {
  UpdateBiometricSetting = 'UpdateBiometricSetting',
}

export interface UpdateBiometricSettingAction {
  type: AppSettingsAction.UpdateBiometricSetting;
  value: boolean;
}

export type AppSettingsActionType = UpdateBiometricSettingAction;

export const updateBiometricSetting = (value: boolean): UpdateBiometricSettingAction => ({
  type: AppSettingsAction.UpdateBiometricSetting,
  value,
});
