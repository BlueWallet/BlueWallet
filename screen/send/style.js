const { StyleSheet } = require("react-native");

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  broadcastResultWrapper: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    width: "100%",
  },
  mainCard: {
    padding: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  topFormRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    paddingTop: 0,
    paddingRight: 100,
  },
  input: {
    flexDirection: "row",
    borderWidth: 1,
    borderBottomWidth: 0.5,
    alignItems: "center",
    borderRadius: 4,
  },
  text: {
    padding: 8,
    minHeight: 33,
    color: "#81868e",
  },

  blueArea: {
    paddingTop: 19,
  },

  root: {
    flex: 1,
    paddingTop: 19,
  },
  buttonContainer: {
    paddingHorizontal: 58,
    paddingBottom: 16,
  },
  amount: {
    alignItems: "center",
  },
  view: {
    flexDirection: "row",
    justifyContent: "center",
  },
  amountValue: {
    fontSize: 36,
    fontWeight: "600",
  },
  amountUnit: {
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: "600",
    alignSelf: "flex-end",
  },
  feeText: {
    color: "#37c0a1",
    fontSize: 14,
    marginHorizontal: 4,
    paddingVertical: 6,
    fontWeight: "500",
    alignSelf: "center",
  },
  ready: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    alignItems: "center",
    marginBottom: 53,
  },
  lottie: {
    width: 200,
    height: 200,
  },

  loading: {
    flex: 1,
    paddingTop: 20,
  },
  scrollViewContent: {
    flexDirection: "row",
  },
  scrollViewIndicator: {
    top: 0,
    left: 8,
    bottom: 0,
    right: 8,
  },
  modalContent: {
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 200,
  },
  optionsContent: {
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 130,
  },
  feeModalItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 10,
  },
  feeModalItemActive: {
    borderRadius: 8,
  },
  feeModalRow: {
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
  },
  feeModalLabel: {
    fontSize: 22,
    fontWeight: "600",
  },
  feeModalTime: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  feeModalCustom: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  feeModalCustomText: {
    fontSize: 15,
    fontWeight: "600",
  },
  createButton: {
    marginVertical: 16,
    marginHorizontal: 16,
    alignContent: "center",
    minHeight: 44,
  },
  select: {
    marginBottom: 24,
    marginHorizontal: 24,
    alignItems: "center",
  },
  selectTouch: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectText: {
    color: "#9aa0aa",
    fontSize: 14,
    marginRight: 8,
  },
  selectWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  selectLabel: {
    fontSize: 14,
  },
  of: {
    alignSelf: "flex-end",
    marginRight: 18,
    marginVertical: 8,
  },
  memo: {
    flexDirection: "row",
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: "center",
    marginVertical: 8,
    borderRadius: 4,
  },
  memoText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    color: "#81868e",
  },
  fee: {
    flexDirection: "row",
    marginHorizontal: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeLabel: {
    fontSize: 14,
  },
  feeRow: {
    minWidth: 40,
    height: 25,
    borderRadius: 4,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  advancedOptions: {
    minWidth: 40,
    height: 40,
    justifyContent: "center",
  },
  frozenContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
  },

  transactionDetailsTitle: {
    fontWeight: "500",
    fontSize: 17,
    marginBottom: 2,
  },
  transactionDetailsSubtitle: {
    fontWeight: "500",
    fontSize: 15,
    marginBottom: 20,
  },
  transactionAmountFiat: {
    fontWeight: "500",
    fontSize: 15,
    marginVertical: 8,
    textAlign: "center",
  },
  valueWrap: {
    flexDirection: "row",
    justifyContent: "center",
  },
  valueValue: {
    fontSize: 36,
    fontWeight: "700",
  },
  valueUnit: {
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: "600",
    alignSelf: "flex-end",
  },
  valueOf: {
    alignSelf: "flex-end",
    marginRight: 18,
    marginVertical: 8,
  },
  separator: {
    height: 0.5,
    margin: 16,
  },
  cardTop: {
    flexGrow: 8,
    marginTop: 16,
    alignItems: "center",
    maxHeight: "70%",
  },
  cardBottom: {
    flexGrow: 2,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  cardContainer: {
    flexGrow: 1,
    width: "100%",
  },
  cardText: {
    flexDirection: "row",
    color: "#37c0a1",
    fontSize: 14,
    marginVertical: 8,
    marginHorizontal: 24,
    paddingBottom: 6,
    fontWeight: "500",
    alignSelf: "center",
  },
  txDetails: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    borderRadius: 8,
    height: 38,
  },
  txText: {
    fontSize: 15,
    fontWeight: "600",
  },
  payjoinWrapper: {
    flexDirection: "row",
    padding: 8,
    borderRadius: 6,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payjoinText: {
    color: "#81868e",
    fontSize: 15,
    fontWeight: "bold",
  },

  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },

  container: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 16,
    paddingBottom: 16,
  },
  rootPadding: {
    flex: 1,
    paddingTop: 20,
  },
  hexWrap: {
    alignItems: "center",
    flex: 1,
  },
  hexLabel: {
    fontWeight: "500",
  },
  hexInput: {
    borderRadius: 4,
    marginTop: 20,
    fontWeight: "500",
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  hexTouch: {
    marginVertical: 24,
  },
  hexText: {
    fontSize: 15,
    fontWeight: "500",
    alignSelf: "center",
  },
  copyToClipboard: {
    justifyContent: "center",
    alignItems: "center",
  },
  hidden: {
    width: 0,
    height: 0,
  },

  transactionDetailsTitle: {
    fontWeight: "500",
    fontSize: 17,
    marginBottom: 2,
  },
  transactionDetailsSubtitle: {
    fontWeight: "500",
    fontSize: 15,
    marginBottom: 20,
  },
  itemOf: {
    alignSelf: "flex-end",
  },
  separator: {
    height: 0.5,
    marginVertical: 16,
  },
  cardText: {
    fontWeight: "500",
  },
  cardTx: {
    borderColor: "#ebebeb",
    backgroundColor: "#d2f8d6",
    borderRadius: 4,
    marginTop: 20,
    color: "#37c0a1",
    fontWeight: "500",
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  actionTouch: {
    marginVertical: 24,
  },
  actionText: {
    color: "#9aa0aa",
    fontSize: 15,
    fontWeight: "500",
    alignSelf: "center",
  },

  mstopcontainer: {
    flex: 1,
    flexDirection: "row",
  },
  mscontainer: {
    flex: 10,
  },
  msleft: {
    width: 1,
    borderStyle: "dashed",
    borderWidth: 0.8,
    borderColor: "#c4c4c4",
    marginLeft: 40,
    marginTop: 130,
  },
  msright: {
    flex: 90,
    marginLeft: "-11%",
  },
  container: {
    flexDirection: "column",
    paddingTop: 24,
    flex: 1,
  },
  containerText: {
    flexDirection: "row",
    justifyContent: "center",
  },
  destinationTextContainer: {
    flexDirection: "row",
    marginBottom: 4,
    paddingHorizontal: 60,
    fontSize: 14,
    justifyContent: "center",
  },
  textFiat: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 30,
  },
  textBtc: {
    fontWeight: "bold",
    fontSize: 30,
  },
  textAlignCenter: {
    textAlign: "center",
  },
  textDestinationFirstFour: {
    fontSize: 14,
  },
  textDestination: {
    paddingTop: 10,
    paddingBottom: 40,
    fontSize: 14,
    flexWrap: "wrap",
  },
  provideSignatureButton: {
    marginTop: 24,
    marginLeft: 40,
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  provideSignatureButtonText: { fontWeight: "600", fontSize: 15 },
  vaultKeyText: { fontSize: 18, fontWeight: "bold" },
  vaultKeyTextWrapper: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 16,
  },
  vaultKeyCircle: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  vaultKeyCircleSuccess: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  itemUnsignedWrapper: { flexDirection: "row", paddingTop: 16 },
  vaultKeyTextSigned: { fontSize: 18, fontWeight: "bold" },
  vaultKeyTextSignedWrapper: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 16,
  },
  flexDirectionRow: { flexDirection: "row", paddingVertical: 12 },
  textBtcUnit: { justifyContent: "flex-end" },
  bottomFeesWrapper: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  bottomWrapper: { marginTop: 16 },
  marginConfirmButton: {
    marginTop: 16,
    marginHorizontal: 32,
    marginBottom: 48,
  },
  height80: {
    height: 80,
  },

  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  modalContentShort: {
    marginLeft: 20,
    marginRight: 20,
  },
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: 22,
    justifyContent: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  tip: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginVertical: 24,
  },
  sendIcon: {
    transform: [{ rotate: "225deg" }],
  },

  closeTouch: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    borderRadius: 20,
    position: "absolute",
    right: 16,
    top: 44,
  },
  closeImage: {
    alignSelf: "center",
  },
  imagePickerTouch: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    borderRadius: 20,
    position: "absolute",
    left: 24,
    bottom: 48,
  },
  filePickerTouch: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    borderRadius: 20,
    position: "absolute",
    left: 96,
    bottom: 48,
  },
  openSettingsContainer: {
    flex: 1,
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
  },
  backdoorButton: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.1)",
    position: "absolute",
  },
  backdoorInputWrapper: {
    position: "absolute",
    left: "5%",
    top: "0%",
    width: "90%",
    height: "70%",
    backgroundColor: "white",
  },
  progressWrapper: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    top: "50%",
    padding: 8,
    borderRadius: 8,
  },
  backdoorInput: {
    height: "50%",
    marginTop: 5,
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 4,
    textAlignVertical: "top",
  },
});
export default styles;
