import { StyleSheet,I18nManager, } from "react-native";

export const styles = StyleSheet.create({
  safeRoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  safeURL: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  safeURLTextWrap: {
    flexDirection: "row",
    borderColor: "#d2d2d2",
    borderBottomColor: "#d2d2d2",
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    backgroundColor: "#f5f5f5",
    minHeight: 44,
    height: 44,
    alignItems: "center",
    marginVertical: 8,
    borderRadius: 4,
  },
  safeURLText: {
    flex: 1,
    marginLeft: 4,
    minHeight: 33,
    color: "#81868e",
  },
  safeURLHome: {
    alignContent: "flex-end",
    height: 44,
    flexDirection: "row",
    marginHorizontal: 8,
  },
  sync: {
    color: "red",
    backgroundColor: "transparent",
    paddingLeft: 15,
  },
  activity: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 20,
    alignContent: "center",
  },
  goBack: {
    backgroundColor: "transparent",
    paddingLeft: 10,
  },
  colorRed: {
    color: "red",
  },
  // eslint-disable-next-line react-native/no-unused-styles
  colorGray: {
    color: "gray",
  },
  transparent: {
    backgroundColor: "transparent",
  },
  colorGreen: {
    color: "green",
  },

  createButton: {
    marginHorizontal: 16,
    marginVertical: 16,
    minHeight: 45,
  },
  scanRoot: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  scanClick: {
    marginLeft: 4,
  },
  walletRoot: {
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  walletChooseWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletChooseText: {
    color: "#9aa0aa",
    fontSize: 14,
    marginRight: 8,
  },
  walletNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  walletNameTouch: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletNameText: {
    fontSize: 14,
  },
  walletNameBalance: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    marginRight: 4,
  },
  walletNameSats: {
    fontSize: 11,
    fontWeight: "600",
    textAlignVertical: "bottom",
    marginTop: 2,
  },
  root: {
    flex: 1,
    justifyContent: "space-between",
  },
  amount: {
    flex: 1,
  },
  fiat: {
    flexDirection: "row",
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: "center",
    marginVertical: 8,
    borderRadius: 4,
  },
  fiat2: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    color: "#81868e",
  },

  loading: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  qrcode: {
    justifyContent: "center",
    alignItems: "center",
  },
  share: {
    marginBottom: 25,
  },

  qrCodeContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
  },

  justifyContentCenter: {
    justifyContent: "center",
  },
  detailsRoot: {
    justifyContent: "flex-end",
    marginBottom: 24,
    alignItems: "center",
  },
  detailsTouch: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsText: {
    fontSize: 14,
    marginRight: 8,
  },
  expired: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  activeRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeQrcode: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },

  alignSelfCenter: {
    alignSelf: "center",
  },
  domainName: {
    alignSelf: "center",
    fontWeight: "bold",
    fontSize: 25,
    paddingVertical: 10,
  },
  walletSelectRoot: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  walletSelectTouch: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletSelectText: {
    color: "#9aa0aa",
    fontSize: 14,
    marginRight: 8,
  },
  walletWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  walletWrapTouch: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletWrapLabel: {
    fontSize: 14,
  },

  img: { width: 200, height: 200, alignSelf: "center" },

  walletWrapBalance: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
    marginRight: 4,
  },
  walletWrapSats: {
    fontSize: 11,
    fontWeight: "600",
    textAlignVertical: "bottom",
    marginTop: 2,
  },

  
  root1: {
    padding: 0,
  },
  container: {
    paddingHorizontal: 16,
  },
  successContainer: {
    marginTop: 10,
  },
  successText: {
    textAlign: 'center',
    margin: 4,
  },
  successValue: {
    fontWeight: 'bold',
  },
  description: {
    marginTop: 20,
  },


  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollMargin: {
    marginTop: 60,
  },
  ScanDescription: {
    flexDirection: 'row',
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 0,
    borderRadius: 4,
  },
  descriptionText: {
    color: '#81868e',
    fontWeight: '500',
    fontSize: 14,
  },
  expiresIn: {
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    color: '#81868e',
    fontSize: 12,
    left: 20,
    top: 10,
  },

  horizontalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },


  marginHorizontal16: {
    marginHorizontal: 16,
  },
  contentContainerStyle: {
    marginHorizontal: 16,
  },
  listHeaderText: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 'bold',
    fontSize: 24,
  },
  listHeaderBack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalContent: {
    minHeight: 418,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    padding: 24,
  },
  separator: {
    height: 1,
    marginTop: 16,
  },

});

export default styles;
