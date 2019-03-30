/* global jest */
jest.mock('react-native-qrcode-svg', () => 'Video');
jest.useFakeTimers();
jest.mock('Picker', () => {
	// eslint-disable-next-line import/no-unresolved
	const React = require('React');
	const PropTypes = require('prop-types');
	return class MockPicker extends React.Component {
		static Item = props => React.createElement('Item', props, props.children);
		static propTypes = { children: PropTypes.any };
		static defaultProps = { children: '' };

		render() {
			return React.createElement('Picker', this.props, this.props.children);
		}
	};
});
jest.mock('ScrollView', () => {
	const RealComponent = require.requireActual('ScrollView');
	const React = require('React');
	class ScrollView extends React.Component {
		scrollTo() {}

		render() {
			return React.createElement('ScrollView', this.props, this.props.children);
		}
	}
	ScrollView.propTypes = RealComponent.propTypes;
	return ScrollView;
});

jest.mock('react-native-google-analytics-bridge', () => ({
	GoogleAnalyticsTracker: () => {
		this.trackEvent = jest.fn();
		return this;
	},
}));