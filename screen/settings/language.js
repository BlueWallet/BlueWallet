import React, { Component } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { BlueLoading, BlueText, SafeBlueArea, BlueListItem, BlueCard, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';
import { AvailableLanguages } from '../../loc/languages';
const loc = require('../../loc');

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

export default class Language extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.settings.language,
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      language: loc.getLanguage(),
      availableLanguages: AvailableLanguages,
    };
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
    });
  }

  renderItem = ({ item }) => {
    return (
      <BlueListItem
        onPress={() => {
          console.log('setLanguage', item.value);
          loc.saveLanguage(item.value);
          return this.setState({ language: item.value });
        }}
        title={item.label}
        {...(this.state.language === item.value
          ? {
              rightIcon: <Icon name="check" type="octaicon" color="#0070FF" />,
            }
          : { hideChevron: true })}
      />
    );
  };

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.flex}>
        <FlatList
          style={styles.flex}
          keyExtractor={(_item, index) => `${index}`}
          data={this.state.availableLanguages}
          extraData={this.state.availableLanguages}
          renderItem={this.renderItem}
        />
        <BlueCard>
          <BlueText>When selecting a new language, restarting BlueWallet may be required for the change to take effect.</BlueText>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

Language.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
