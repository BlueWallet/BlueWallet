import React, { useState } from 'react';
import { InputItem } from './InputItem';
import { NavigationService } from 'services';

interface Props {
  label: string;
  title: string;
  value?: string;
}

export const GenericInputItem = (props: Props) => {
  const [label] = useState(props.label);
  const [title] = useState(props.title);
  const [value, setValue] = useState(props.value);

  const handleValueSave = (value: string) => setValue(value);

  return (
    <InputItem
      value={value}
      onFocus={() =>
        NavigationService.navigate('EditText', {
          title: title,
          label: label,
          value: value,
          onSave: handleValueSave,
        })
      }
      label={label}
    />
  );
};
