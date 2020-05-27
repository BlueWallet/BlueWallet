import React, { useState } from 'react';

import { NavigationService } from 'app/services';

import { InputItem } from './InputItem';

interface Props {
  label: string;
  title: string;
  value?: string;
  onSave?: (value: string) => void;
}

export const GenericInputItem = (props: Props) => {
  const [label] = useState(props.label);
  const [title] = useState(props.title);
  const [value, setValue] = useState(props.value);
  const handleValueSave = (value: string) => {
    setValue(value);
    value && props.onSave && props.onSave(value);
  };
  const onFocus = () =>
    NavigationService.navigate('EditText', {
      title,
      label,
      value,
      onSave: handleValueSave,
    });

  return <InputItem focused value={value} onFocus={onFocus} label={label} />;
};
