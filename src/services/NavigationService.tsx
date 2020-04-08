import * as React from 'react';

export const navigationRef: any = React.createRef();

export function navigate(name: string, params?: any) {
  // eslint-disable-next-line prettier/prettier
  navigationRef.current?.navigate(name, params);
}
