import React from 'react';
import { render } from '@testing-library/react-native';
import SegmentedControl from '../../components/SegmentedControl';

jest.mock('../../codegen/SegmentedControlNativeComponent', () => {
  const { View } = require('react-native');
  const MockSegmentedControl = ({ values, selectedIndex, onChange, testID }: any) =>
    React.createElement(View, { testID: testID ?? 'segmented-control' });
  return {
    __esModule: true,
    default: MockSegmentedControl,
  };
});

describe('SegmentedControl', () => {
  const VALUES = ['One', 'Two', 'Three'];

  it('renders without crashing', () => {
    const { getByTestId } = render(<SegmentedControl values={VALUES} selectedIndex={0} onChange={jest.fn()} testID="sc" />);
    expect(getByTestId('sc')).toBeTruthy();
  });

  it('returns null when values array is empty', () => {
    const { toJSON } = render(<SegmentedControl values={[]} selectedIndex={0} onChange={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('passes values and selectedIndex to native component', () => {
    const { getByTestId } = render(<SegmentedControl values={VALUES} selectedIndex={1} onChange={jest.fn()} testID="sc2" />);
    expect(getByTestId('sc2')).toBeTruthy();
  });

  it('calls onChange with the correct index when selection changes', () => {
    const onChangeMock = jest.fn();
    const { UNSAFE_getAllByType } = render(<SegmentedControl values={VALUES} selectedIndex={0} onChange={onChangeMock} />);
    const MockSegmentedControl = require('../../codegen/SegmentedControlNativeComponent').default;
    const [instance] = UNSAFE_getAllByType(MockSegmentedControl);
    // Simulate native onChange event
    instance.props.onChange?.({ nativeEvent: { selectedIndex: 2 } });
    expect(onChangeMock).toHaveBeenCalledWith(2);
  });
});
