import React, { useState } from 'react';

import { Route } from 'app/consts';
import { NavigationService } from 'app/services';

import { InputItem } from './InputItem';

interface Props {
  label: string;
  title: string;
  value?: string;
  validate?: (value: string) => string | undefined;
  validateOnSave?: (value: string) => void;
  onSave?: (value: string) => void;
  maxLength?: number;
  testID?: string;
}

export const GenericInputItem = (props: Props) => {
  const [label] = useState(props.label);
  const [title] = useState(props.title);
  const [value, setValue] = useState(props.value);
  const handleValueSave = (newValue: string) => {
    setValue(newValue);
    value && props.onSave && props.onSave(newValue);
  };
  const onFocus = () => {
    const { maxLength, validate, validateOnSave } = props;
    NavigationService.navigate(Route.EditText, {
      title,
      label,
      value,
      validate,
      validateOnSave,
      onSave: handleValueSave,
      maxLength,
    });
  };
  return <InputItem testID={props.testID} focused value={value} onFocus={onFocus} label={label} />;
};
