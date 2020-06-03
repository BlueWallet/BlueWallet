import React, { Component } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { BlueLoading, BlueText, SafeBlueArea, BlueListItem, BlueCard, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';
let loc = require('../../loc');

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
      availableLanguages: [
        { label: 'English', value: 'en' },
        { label: 'Afrikaans (AFR)', value: 'zar_afr' },
        { label: 'Chinese (ZH)', value: 'zh_cn' },
        { label: 'Chinese (TW)', value: 'zh_tw' },
        { label: 'Croatian (HR)', value: 'hr_hr' },
        { label: 'Česky (CZ)', value: 'cs_cz' },
        { label: 'Danish (DK)', value: 'da_dk' },
        { label: 'Deutsch (DE)', value: 'de_de' },
        { label: 'Español (ES)', value: 'es' },
        { label: 'Ελληνικά (EL)', value: 'el' },
        { label: 'Italiano (IT)', value: 'it' },
        { label: 'Suomi (FI)', value: 'fi_fi' },
        { label: 'Français (FR)', value: 'fr_fr' },
        { label: 'Indonesia (ID)', value: 'id_id' },
        { label: 'Magyar (HU)', value: 'hu_hu' },
        { label: '日本語 (JP)', value: 'jp_jp' },
        { label: 'Nederlands (NL)', value: 'nl_nl' },
        { label: 'Norsk (NB)', value: 'nb_no' },
        { label: 'Português (BR)', value: 'pt_br' },
        { label: 'Português (PT)', value: 'pt_pt' },
        { label: 'Русский', value: 'ru' },
        { label: 'Slovensky (SK)', value: 'sk_sk' },
        { label: 'Svenska (SE)', value: 'sv_se' },
        { label: 'Thai (TH)', value: 'th_th' },
        { label: 'Vietnamese (VN)', value: 'vi_vn' },
        { label: 'Українська', value: 'ua' },
        { label: 'Türkçe (TR)', value: 'tr_tr' },
        { label: 'Xhosa (XHO)', value: 'zar_xho' },
        { label: 'Català (CA)', value: 'ca' },
      ],
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
