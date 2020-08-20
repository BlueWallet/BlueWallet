import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';

import { icons } from 'app/assets';
import { Header, ScreenTemplate, Image, Separator } from 'app/components';
import { Authenticator, MainCardStackNavigatorParams, Route } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { ApplicationState } from 'app/state';
import { selectors, actions } from 'app/state/authenticators';
import { AuthenticatorsState } from 'app/state/authenticators/reducer';
import { palette, typography } from 'app/styles';

import { formatDate } from '../../../utils/date';

const i18n = require('../../../loc');

interface MapStateProps {
  authenticator?: Authenticator;
}

interface ActionProps {
  deleteAuthenticator: Function;
}

interface NavigationProps {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.ExportAuthenticator>;
  route: RouteProp<MainCardStackNavigatorParams, Route.ExportAuthenticator>;
}

type Props = MapStateProps & ActionProps & NavigationProps;

class OptionsAuthenticatorScreen extends Component<Props> {
  onDelete = () => {
    const { deleteAuthenticator, navigation, authenticator } = this.props;
    authenticator &&
      navigation.navigate(Route.DeleteEntity, {
        name: authenticator.name,
        title: i18n.authenticators.delete.title,
        subtitle: i18n.authenticators.delete.subtitle,
        onConfirm: () => {
          deleteAuthenticator(authenticator.id, {
            onSuccess: () => {
              CreateMessage({
                title: i18n.message.allDone,
                description: i18n.authenticators.delete.success,
                type: MessageType.success,
                buttonProps: {
                  title: i18n.message.returnToAuthenticators,
                  onPress: () => navigation.navigate(Route.AuthenticatorList),
                },
              });
            },
          });
        },
      });
  };

  navigateToPair = () => {
    const { authenticator, navigation } = this.props;

    authenticator && navigation.navigate(Route.PairAuthenticator, { id: authenticator.id });
  };

  navigateToExport = () => {
    const { authenticator, navigation } = this.props;

    authenticator && navigation.navigate(Route.ExportAuthenticator, { id: authenticator.id });
  };

  render() {
    const { authenticator, navigation } = this.props;

    if (!authenticator) {
      return null;
    }
    return (
      <ScreenTemplate
        contentContainer={styles.contentContainer}
        header={<Header navigation={navigation} isBackArrow title={i18n.authenticators.options.title} />}
      >
        <View>
          <Text style={styles.subtitle}>{authenticator.name}</Text>
          <Text style={[styles.desc, styles.center]}>
            {i18n._.created} {formatDate(authenticator.createdAt)}
          </Text>
          <Separator />
          <View style={styles.optionsContainer}>
            <Text style={[styles.desc, styles.bottomSpace]}>{i18n.authenticators.options.sectionTitle}</Text>
            <TouchableOpacity style={styles.optionWrapper} onPress={this.navigateToExport}>
              <Image source={icons.export} style={styles.icon} />
              <Text>{i18n.authenticators.options.export}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionWrapper} onPress={this.navigateToPair}>
              <Image source={icons.pair} style={styles.icon} />
              <Text>{i18n.authenticators.options.pair}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.deleteWrapper} onPress={this.onDelete}>
          <Text style={styles.delete}>{i18n.authenticators.options.delete}</Text>
        </TouchableOpacity>
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState & AuthenticatorsState, props: Props): MapStateProps => {
  const { id } = props.route.params;
  return {
    authenticator: selectors.getById(state, id),
  };
};

const mapDispatchToProps: ActionProps = {
  deleteAuthenticator: actions.deleteAuthenticator,
};

export default connect(mapStateToProps, mapDispatchToProps)(OptionsAuthenticatorScreen);

const styles = StyleSheet.create({
  contentContainer: {
    justifyContent: 'space-between',
  },
  deleteWrapper: {
    padding: 20,
  },
  delete: {
    textAlign: 'center',
    ...typography.headline5,
    color: palette.lightRed,
  },
  bottomSpace: {
    marginBottom: 24,
  },
  optionWrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  icon: {
    marginRight: 20,
    width: 21,
    height: 21,
  },
  center: {
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    ...typography.headline4,
    textAlign: 'center',
  },
  desc: {
    color: palette.textGrey,
    ...typography.caption,
  },
  optionsContainer: {
    paddingTop: 4,
    borderColor: palette.lightGrey,
  },
});
