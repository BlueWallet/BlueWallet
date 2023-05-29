const { StyleSheet,I18nManager } = require("react-native");
import { BlueCurrentTheme } from '../../components/themes';

const styles = StyleSheet.create({
  copyToClipboard: {
    justifyContent: "center",
    alignItems: "center",
  },
  copyToClipboardText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#68bbe1",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 54,
  },
  logo: {
    width: 102,
    height: 124,
  },
  textFree: {
    maxWidth: 260,
    marginVertical: 24,
    color: "#9AA0AA",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "500",
  },
  textBackup: {
    maxWidth: 260,
    marginBottom: 40,
    fontSize: 15,
    textAlign: "center",
    fontWeight: "500",
  },
  buildWith: {
    
    padding: 16,
    paddingTop: 0,
    borderRadius: 8,
  },
  buttonLink: {
    
    borderRadius: 12,
    justifyContent: "center",
    padding: 8,
    flexDirection: "row",
  },
  textLink: {
    
    marginLeft: 8,
    fontWeight: "600",
  },


  root: {
    flex: 1,
  },
  uri: {
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
  centered: {
    textAlign: 'center',
  },
  uriText: {
    flex: 1,
    color: '#81868e',
    marginHorizontal: 8,
    minHeight: 36,
    height: 36,
  },
  buttonStyle: {
    backgroundColor: 'transparent',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
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
    backgroundColor: BlueCurrentTheme.colors.redBG,
  },
  textConnected: {
    color: BlueCurrentTheme.colors.feeValue,
    fontWeight: 'bold',
  },
  textDisconnected: {
    color: BlueCurrentTheme.colors.redText,
    fontWeight: 'bold',
  },
  hostname: {
    textAlign: 'center',
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  usePort: {
    textAlign: 'center',
    color: BlueCurrentTheme.colors.foregroundColor,
    marginHorizontal: 8,
  },
  explain: {
    color: BlueCurrentTheme.colors.feeText,
    marginBottom: -24,
    flexShrink: 1,
  },
  inputWrap: {
    flex: 1,
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
  portWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 36,
    color: '#81868e',
    height: 36,
  },
  serverAddTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  serverHistoryTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  serverHistoryItem: {
    flexDirection: 'row',
    paddingVertical: 20,
    borderBottomColor: BlueCurrentTheme.colors.formBorder,
    borderBottomWidth: 0.5,
    flexWrap: 'nowrap',
  },
  serverRow: {
    flexGrow: 2,
    maxWidth: '80%',
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  selectButton: {
    flexGrow: 1,
    marginLeft: 16,
    alignItems: 'flex-end',
  },
  uriText: {
    flex: 1,
    color: '#81868e',
    marginHorizontal: 8,
    minHeight: 36,
    height: 36,
  },
});
export default styles;
