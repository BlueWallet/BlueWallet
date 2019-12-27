import React from 'react';
import { 
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import NfcManager, {Ndef, NfcTech} from 'react-native-nfc-manager';

function buildUrlPayload(valueToWrite) {
    return Ndef.encodeMessage([
        Ndef.uriRecord(valueToWrite),
    ]);
}

class AppV2Ndef extends React.Component {
  componentDidMount() {
    NfcManager.start();
  }

  componentWillUnmount() {
    this._cleanUp();
  }

  render() {
    return (
      <View style={{padding: 20}}>
        <Text>NFC Demo</Text>
        <TouchableOpacity 
          style={{padding: 10, width: 200, margin: 20, borderWidth: 1, borderColor: 'black'}}
          onPress={this._testNdef}
        >
          <Text>Test Ndef</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{padding: 10, width: 200, margin: 20, borderWidth: 1, borderColor: 'black'}}
          onPress={this._cleanUp}
        >
          <Text>Cancel Test</Text>
        </TouchableOpacity>
      </View>
    )
  }

  _cleanUp = () => {
    NfcManager.cancelTechnologyRequest().catch(() => 0);
  }

  _testNdef = async () => {
    try {
      let resp = await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Ready to write some NFC tags!'
      });
      console.warn(resp);
      let ndef = await NfcManager.getNdefMessage();
      console.warn(ndef);
      let bytes = buildUrlPayload('https://www.revteltech.com');
      await NfcManager.writeNdefMessage(bytes);
      console.warn('successfully write ndef');
      await NfcManager.setAlertMessageIOS('I got your tag!');
      this._cleanUp();
    } catch (ex) {
      console.warn('ex', ex);
      this._cleanUp();
    }
  }
}

export default AppV2Ndef;
