import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';
import KeyboardShortcuts from '../../screen/settings/KeyboardShortcuts';

jest.mock('../../components/HeaderMenu', () => ({ usesHeaderMenu: true }));
jest.mock('../../components/themes', () => ({ useTheme: () => ({ colors: {} }) }));

it('exposes each shortcut as one readable accessibility element with its screen context', () => {
  const view = render(<KeyboardShortcuts />);
  expect(view.getByLabelText('Add Recipient, Command Shift N. Recipients')).toBeTruthy();
  expect(view.getByLabelText('Close, Command W or Escape. Current sheet or modal')).toBeTruthy();
  expect(view.getByText('Unavailable commands are dimmed. Shortcuts apply to the current screen.')).toBeTruthy();
  view.unmount();
});

it('shows Ctrl/Alt/Enter shortcuts and readable TalkBack descriptions on Android tablets', () => {
  const original = Platform.OS;
  Platform.OS = 'android';
  try {
    const view = render(<KeyboardShortcuts />);
    expect(view.getByLabelText('Add Recipient, Control Shift N. Recipients')).toBeTruthy();
    expect(view.getAllByLabelText(/Control Alt N/)).toHaveLength(2);
    expect(view.getByLabelText('Close, Control W or Escape. Current sheet or modal')).toBeTruthy();
    expect(view.getAllByText('Ctrl+Alt+N')).toHaveLength(2);
    expect(view.getAllByText('Ctrl+Enter')).toHaveLength(2);
    expect(view.getByText('Ctrl+M')).toBeTruthy();
    view.unmount();
  } finally {
    Platform.OS = original;
  }
});
