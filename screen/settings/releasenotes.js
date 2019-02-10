import React, { Component } from 'react';
import { ScrollView } from 'react-native';
import { BlueLoading, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
const notes = require('../../release-notes');

export default class ReleaseNotes extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: 'Release notes',
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
  }

  async componentDidMount() {
    console.log(notes);
    this.setState({
      isLoading: false,
      notes: notes,
    });
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <ScrollView>
          <BlueCard>
            <BlueText>{this.state.notes}</BlueText>
          </BlueCard>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

ReleaseNotes.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
