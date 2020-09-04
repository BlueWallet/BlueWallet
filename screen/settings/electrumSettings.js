/* global alert */
import React, { Component } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, Switch } from 'react-native';
import { AppStorage } from '../../class';
import AsyncStorage from '@react-native-community/async-storage';
import { ScrollView } from 'react-native-gesture-handler';
import { BlueLoading, BlueSpacing20, BlueButton, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle, BlueListItem } from '../../BlueComponents';
import { BlueCurrentTheme } from '../../components/themes';
import loc from '../../loc';
const BlueElectrum = require('../../blue_modules/BlueElectrum');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  status: {
    textAlign: 'center',
    color: BlueCurrentTheme.colors.feeText,
    marginBottom: 4,
  },
  connectWrap: {
    width: 'auto',
    height: 34,
    flexWrap: 'wrap',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  container: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 20,
  },
  containerConnected: {
    backgroundColor: BlueCurrentTheme.colors.feeLabel,
  },
  containerDisconnected: {
    backgroundColor: '#F8D2D2',
  },
  textConnected: {
    color: BlueCurrentTheme.colors.feeValue,
    fontWeight: 'bold',
  },
  textDisconnected: {
    color: '#D0021B',
    fontWeight: 'bold',
  },
  hostname: {
    textAlign: 'center',
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  addServerTitle: {
    flexDirection:'row', 
    justifyContent: 'space-between',
  },
  settingText: {
    color: BlueCurrentTheme.colors.feeText,    
  },
  inputWrap: {
    flexDirection: 'row',
    borderColor: BlueCurrentTheme.colors.formBorder,
    borderBottomColor: BlueCurrentTheme.colors.formBorder,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 4,
  },
  inputText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 36,
    color: '#81868e',
    height: 36,
  },
  serverListTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -20,
  },
  serverListTitleText: {
    fontSize: 11,
    color: '#ff0000',
  },
  serverListItem: {
    fontSize: 14,
    paddingHorizontal: 5,
  },
  serverListActions: {
    flexDirection: 'row',
  },
  serverListSelect: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    padding: 5,
    borderRadius: 20,
    marginRight: 5,
    backgroundColor: '#ccddf9',
  },
  serverListRemove: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 5,
    backgroundColor: '#eef0f4',
  },
  serverListSelected: {
    fontSize: 11,
    color: '#0c2550',
    marginRight: 5,
  },
  serverListSelectText: {
    fontSize: 11,
    color: '#0c2550',
  },
  serverListRemoveText: {
    fontSize: 11,
    color: '#ff0000',
  },
});

export default class ElectrumSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      config: {},
      serverList: [],
      host: '',
      port: '',
      sslPort: '',
      isSslPort: true,
    };
  }

  componentWillUnmount() {
    clearInterval(this.state.inverval);
  }

  async componentDidMount() {
    const serverListData = await AsyncStorage.getItem(AppStorage.ELECTRUM_SERVER_LIST);

    if (serverListData && Array.isArray(JSON.parse(serverListData))) {
      console.log('[DEBUG] componentDidMount serverList', serverListData);
      this.setState({
        serverList: JSON.parse(serverListData),
      });
    }

    const inverval = setInterval(async () => {
      this.setState({
        config: await BlueElectrum.getConfig(),
      });
    }, 500);

    this.setState({
      config: await BlueElectrum.getConfig(),
      inverval,
      isLoading: false,
    });
  }

  selectServer = async selectedServer => {
    const { host, tcp, ssl } = selectedServer;
    const { serverList } = this.state;
    console.log('[DEBUG] selectServer current serverList', serverList);
    this.setState({ isLoading: true });

    try {
      const canConnect = await BlueElectrum.testConnection(host, tcp, ssl);

      if (canConnect) {
        serverList.forEach(function (server) {
          if (`${server.host}${server.tcp}${server.ssl}` === `${host}${tcp}${ssl}`) {
            server.selected = true;
            console.log('[DEBUG] marked as selected', server);
          } else {
            server.selected = false;
            console.log('[DEBUG] marked as not selected', server);
          }          
        });
        await AsyncStorage.setItem(AppStorage.ELECTRUM_SERVER_LIST, JSON.stringify(serverList));
        console.log('[DEBUG] selectServer updated serverList', serverList);

        this.setState({ serverList, isLoading: false });
        alert(loc.settings.electrum_saved);
      } else {
        this.setState({ isLoading: false });
        alert(loc.settings.electrum_error_connect);
      }
    } catch (error) {
      alert(error);
      this.setState({ isLoading: false });
    }
  };

  removeServer = async (server) => {
    const { host, tcp, ssl } = server;
    const { serverList } = this.state;
    this.setState({ isLoading: true });
    
    const updatedList = serverList.filter(function (server, i) {
      if (`${server.host}${server.tcp}${server.ssl}` !== `${host}${tcp}${ssl}`) {
        return server;
      }
    });
    await AsyncStorage.setItem(AppStorage.ELECTRUM_SERVER_LIST, JSON.stringify(updatedList));
    this.setState({ serverList: updatedList, isLoading: false });
    alert('Server removed');
  };

  resetServers = async () => {
    this.setState({ isLoading: true });
    await AsyncStorage.setItem(AppStorage.ELECTRUM_SERVER_LIST, JSON.stringify([]))
    this.setState({
      serverList: [],
      isLoading: false
    });
  };

  checkServer = async () => {
    this.setState({ isLoading: true }, async () => {
      const features = await BlueElectrum.serverFeatures();
      alert(JSON.stringify(features, null, 2));
      this.setState({ isLoading: false });
    });
  };

  serverExists = (host, tcp, ssl) => {
    const { serverList } = this.state;
    return serverList.some(server => {
        return `${server.host}${server.tcp}${server.ssl}` === `${host}${tcp}${ssl}`;
    });
  }

  onSslSwitch = () => {
    return this.setState({
      isSslPort: !this.state.isSslPort,
      port: '',
      sslPort: '',
    });
  }

  save = async () => {
    const { serverList } = this.state;
    const { host, port, sslPort } = this.state;
    this.setState({ isLoading: true });

    try {
      if (!host  || !port && !sslPort) {
        alert('Please specify host and port');
        this.setState({ isLoading: false });
        return false;
      }

      if (this.serverExists(host, port, sslPort)) {
        alert('Server already exists');
        this.setState({ isLoading: false });
        return false;
      }

      if (!(await BlueElectrum.testConnection(host, port, sslPort))) {
        alert(loc.settings.electrum_error_connect);
        this.setState({ isLoading: false });
        return false;
      }

      serverList.push({
        host,
        tcp: port,
        ssl: sslPort,
        selected: false
      });

      await AsyncStorage.setItem(AppStorage.ELECTRUM_SERVER_LIST, JSON.stringify(serverList));
      this.setState({ serverList, isLoading: false });
      alert('Server saved to list');      
    } catch (error) {
      alert(error);
      this.setState({ isLoading: false });
    }
  };

  render() {
    const { serverList } = this.state;    
    const serverListItems = serverList.map(
      (server, i) => {
        return (
          <BlueListItem
            key={i}
            title={`${server.host}:${server.ssl || server.tcp}`}
            titleStyle={styles.serverListItem}
            rightTitle={
              (server.selected) ? (
                (`${server.host}${server.tcp}${server.ssl}` === `${this.state.config.host}${this.state.config.port}`) ? (
                  <View style={styles.serverListActions}>
                    <Text style={styles.serverListSelected}>Connected</Text>
                  </View>
                ) : (
                  <View style={styles.serverListActions}>
                    <Text style={styles.serverListSelected}>Restart to connect</Text>
                  </View>
                )
              ) : (
                <View style={styles.serverListActions}>
                  <TouchableOpacity
                      style={styles.serverListSelect}
                      onPress={() => this.selectServer(server)}
                  >
                    <Text style={styles.serverListSelectText}>Select</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      style={styles.serverListRemove}
                      onPress={() => this.removeServer(server)}
                  >
                    <Text style={styles.serverListRemoveText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        )
      }
    );

    return (
        <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
          <ScrollView>
          <BlueCard>
            <BlueText style={styles.status}>{loc.settings.electrum_status}</BlueText>
            <View style={styles.connectWrap}>
              <View style={[styles.container, this.state.config.status === 1 ? styles.containerConnected : styles.containerDisconnected]}>
                  <BlueText style={this.state.config.status === 1 ? styles.textConnected : styles.textDisconnected}>
                      {this.state.config.status === 1 ? loc.settings.electrum_connected : loc.settings.electrum_connected_not}
                  </BlueText>
              </View>
            </View>
            <BlueSpacing20 />
            <BlueText style={styles.hostname} onPress={this.checkServer}>
                {this.state.config.host}:{this.state.config.port}
            </BlueText>            
          </BlueCard>
          {serverListItems.length > 0 && (
            <>
              <BlueCard>
                <View style={styles.serverListTitle}>
                  <BlueText style={styles.settingText}>Custom electrum servers</BlueText>
                  <TouchableOpacity
                    onPress={() => this.resetServers()}
                    style={styles.serverListRemove}
                  >
                    <Text style={styles.serverListRemoveText}>Reset to default</Text></TouchableOpacity>
                </View>
              </BlueCard>
              <ScrollView>
                  {serverListItems}
              </ScrollView>
            </>
          )}
          <BlueCard>
            <View style={styles.addServerTitle}>
              <BlueText style={styles.settingText}>Add custom server</BlueText>
              <View style={{flexDirection:'row', justifyContent: 'center'}}>
                <Text style={styles.settingText}>Use SSL</Text>
                <Switch
                  onValueChange={() => this.onSslSwitch()}
                  value={this.state.isSslPort || false}                  
                />
              </View>
            </View>
            <BlueSpacing20 />
            <View style={styles.inputWrap}>
              <TextInput
                placeholder={loc.formatString(loc.settings.electrum_host, { example: '111.222.333.111' })}
                value={this.state.host}
                onChangeText={text => this.setState({ host: text.toLowerCase().trim() })}
                numberOfLines={1}
                style={styles.inputText}
                editable={!this.state.isLoading}
                placeholderTextColor="#81868e"
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
            </View>
            {!this.state.isSslPort ? (
              <>
                <BlueSpacing20 />
                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder={loc.formatString(loc.settings.electrum_port, { example: '50001' })}
                    value={this.state.port}
                    onChangeText={text => this.setState({ port: text.trim() })}
                    numberOfLines={1}
                    style={styles.inputText}
                    editable={!this.state.isLoading}
                    placeholderTextColor="#81868e"
                    underlineColorAndroid="transparent"
                    autoCorrect={false}
                    keyboardType={'numeric'}
                  />
                </View>
              </>
            ):(
              <>
                <BlueSpacing20 />
                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder={loc.formatString(loc.settings.electrum_port_ssl, { example: '50002' })}
                    value={this.state.sslPort}
                    onChangeText={text => this.setState({ sslPort: text.trim() })}
                    numberOfLines={1}
                    style={styles.inputText}
                    editable={!this.state.isLoading}
                    autoCorrect={false}
                    placeholderTextColor="#81868e"
                    underlineColorAndroid="transparent"
                    keyboardType={'numeric'}
                  />
                </View>
              </>
            )}
            <BlueSpacing20 />
            {this.state.isLoading ? <BlueLoading /> : <BlueButton onPress={this.save} title={loc.settings.save} />}
          </BlueCard>
        </ScrollView>
      </SafeBlueArea>
      );
    };
  }

  ElectrumSettings.navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.settings.electrum_settings,
  });
