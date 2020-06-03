import React, { PureComponent } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';
import { connect } from 'react-redux';

import { Header, ListItem } from 'app/components';
import { ApplicationState } from 'app/state';
import { updateAdvancedOptions, UpdateAdvancedOptionsAction } from 'app/state/appSettings/actions';
import { AppSettingsState } from 'app/state/appSettings/reducer';
import { typography, palette } from 'app/styles';

const i18n = require('../../../loc');

interface Props extends NavigationScreenProps {
  appSettings: AppSettingsState;
  updateAdvancedOptions: (value: boolean) => UpdateAdvancedOptionsAction;
}

class AdvancedOptionsScreen extends PureComponent<Props> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header isBackArrow={true} navigation={props.navigation} title={i18n.settings.advancedOptions} />,
  });

  onSwitch = (value: boolean) => {
    this.props.updateAdvancedOptions(value);
  };

  render() {
    return (
      <View>
        <Text style={styles.title}>{i18n.advancedOptions.title}</Text>
        <Text style={styles.description}>{i18n.advancedOptions.description}</Text>
        <View style={styles.divider} />
        <ListItem
          containerStyle={styles.listItemContainer}
          title={i18n.settings.advancedOptions}
          onSwitchValueChange={this.onSwitch}
          switchValue={this.props.appSettings.isAdvancedOptionsEnabled}
        />
        <View style={styles.divider} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  title: {
    ...typography.headline4,
    alignSelf: 'center',
    marginVertical: 18,
    marginTop: 40,
  },
  description: {
    ...typography.caption,
    color: palette.textGrey,
    alignSelf: 'center',
    marginVertical: 10,
    marginHorizontal: 15,
    textAlign: 'center',
  },
  listItemContainer: { paddingRight: 15 },
  divider: { width: '100%', height: 1, backgroundColor: palette.lightGrey, marginVertical: 20 },
});

const mapStateToProps = (state: ApplicationState) => ({
  appSettings: state.appSettings,
});

const mapDispatchToProps = {
  updateAdvancedOptions,
};

export default connect(mapStateToProps, mapDispatchToProps)(AdvancedOptionsScreen);
