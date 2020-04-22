import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share';
import { NavigationInjectedProps, NavigationScreenProps } from 'react-navigation';

import { Button, ContactAvatar, Header, ScreenTemplate } from 'app/components';
import { Contact } from 'app/consts';
import i18n from 'app/locale';
import { typography } from 'app/styles';

type Props = NavigationInjectedProps<{ contact: Contact }>;

export class ContactQRCodeScreen extends React.PureComponent<Props> {
  qrCodeSVG: any;

  static navigationOptions = (props: NavigationScreenProps<{ contact: Contact }>) => ({
    header: <Header navigation={props.navigation} isBackArrow title={props.navigation.getParam('contact').name} />,
  });

  openShareDialog = () => {
    const contact = this.props.navigation.getParam('contact');
    this.qrCodeSVG.toDataURL((data: string) => {
      const shareImageBase64 = {
        message: `bitcoin:${contact.address}`,
        url: `data:image/png;base64,${data}`,
      };
      Share.open(shareImageBase64).catch(error => console.log(error));
    });
  };

  render() {
    const contact = this.props.navigation.getParam('contact');
    return (
      <ScreenTemplate footer={<Button onPress={this.openShareDialog} title={i18n.contactDetails.share} />}>
        <ContactAvatar name={contact.name} />
        <View style={styles.qrCodeContainer}>
          <QRCode value={contact.address} size={140} ecl={'H'} getRef={ref => (this.qrCodeSVG = ref)} />
        </View>
        <Text style={styles.address}>{contact.address}</Text>
      </ScreenTemplate>
    );
  }
}

export default ContactQRCodeScreen;

const styles = StyleSheet.create({
  qrCodeContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  address: {
    ...typography.headline5,
    textAlign: 'center',
  },
});
