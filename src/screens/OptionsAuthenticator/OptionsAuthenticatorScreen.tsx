import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { cloneDeep } from 'lodash';
import React, { Component } from 'react';
import { Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share';
import { connect } from 'react-redux';

import { Header, ScreenTemplate, FlatButton, Separator, TextAreaItem, Mnemonic, InputItem } from 'app/components';
import { Authenticator, MainCardStackNavigatorParams, Route } from 'app/consts';
import { maxAuthenticatorNameLength } from 'app/consts/text';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { formatDate } from 'app/helpers/date';
import { matchAlphanumericCharacters } from 'app/helpers/string';
import { ApplicationState } from 'app/state';
import { selectors, actions } from 'app/state/authenticators';
import { AuthenticatorsState } from 'app/state/authenticators/reducer';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface MapStateProps {
  authenticator?: Authenticator;
  authenticators: Authenticator[];
}

interface ActionProps {
  deleteAuthenticator: Function;
  updateAuthenticator: Function;
}

interface NavigationProps {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.OptionsAuthenticator>;
  route: RouteProp<MainCardStackNavigatorParams, Route.OptionsAuthenticator>;
}

interface State {
  name: string;
}

type Props = MapStateProps & ActionProps & NavigationProps;

class OptionsAuthenticatorScreen extends Component<Props, State> {
  state = {
    name: this.props.authenticator?.name || '',
  };

  onDelete = () => {
    const { deleteAuthenticator, navigation, authenticator } = this.props;
    authenticator &&
      navigation.navigate(Route.DeleteEntity, {
        name: authenticator?.name,
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

  share = () => {
    const { authenticator } = this.props;
    Share.open({ message: authenticator?.publicKey });
  };

  setName = (name: string) => this.setState({ name });

  get validationError(): string | undefined {
    const { authenticators, authenticator } = this.props;
    const { name } = this.state;
    const trimmedName = name.trim();
    const authenticatorsLabels = authenticators.map(a => a.name);
    if (trimmedName?.length === 0) {
      return i18n.authenticators.errors.noEmpty;
    }
    if (matchAlphanumericCharacters(name)) {
      return i18n.contactCreate.nameCannotContainSpecialCharactersError;
    }
    if (authenticatorsLabels.includes(trimmedName.trim()) && trimmedName !== authenticator?.name) {
      return i18n.authenticators.import.inUseValidationError;
    }
    return;
  }

  saveNameAuthenticator = () => {
    const { authenticator, updateAuthenticator } = this.props;
    const { name } = this.state;
    if (!!this.validationError || !authenticator) {
      return;
    }

    const updatedAuthenticator = cloneDeep(authenticator);
    updatedAuthenticator.name = name.trim();
    updateAuthenticator(updatedAuthenticator);
  };

  render() {
    const { authenticator, navigation } = this.props;

    if (!authenticator) {
      return null;
    }
    return (
      <ScreenTemplate
        contentContainer={styles.contentContainer}
        // @ts-ignore
        header={<Header navigation={navigation} isBackArrow title={i18n.authenticators.options.title} />}
      >
        <View>
          <Text style={styles.subtitle}>{authenticator.name}</Text>
          <Text style={[styles.desc, styles.center]}>
            {i18n._.created} {formatDate(authenticator.createdAt)}
          </Text>
          <Separator />
          <View style={styles.optionsContainer}>
            <InputItem
              onSubmitEditing={this.saveNameAuthenticator}
              onEndEditing={this.saveNameAuthenticator}
              value={this.state.name}
              error={this.validationError}
              setValue={this.setName}
              label={i18n.wallets.add.inputLabel}
              maxLength={maxAuthenticatorNameLength}
            />
            <Text style={styles.subtitlePairKey}>{i18n.authenticators.publicKey.title}</Text>
            <TextAreaItem value={authenticator.publicKey} editable={false} style={styles.textArea} />
            <FlatButton onPress={this.share} title={i18n.receive.details.share} />
            <Text style={styles.subtitle}>{i18n.wallets.exportWallet.title}</Text>
            <View style={styles.qrCodeContainer}>
              <QRCode quietZone={10} value={authenticator.QRCode} size={140} ecl={'H'} />
            </View>
            <Mnemonic mnemonic={authenticator.secret} />
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
    authenticators: selectors.list(state),
  };
};

const mapDispatchToProps: ActionProps = {
  deleteAuthenticator: actions.deleteAuthenticator,
  updateAuthenticator: actions.updateAuthenticator,
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
  textArea: {
    height: 130,
  },
  subtitlePairKey: {
    marginTop: 12,
    marginBottom: 18,
    ...typography.headline4,
    textAlign: 'center',
  },
  qrCodeContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
