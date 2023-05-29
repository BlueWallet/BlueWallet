import {StyleSheet} from 'react-native'
const styles = StyleSheet.create({
loading: {
    flex: 1,
    paddingTop: 20,
},
root: {
    alignItems: 'center',
    alignContent: 'flex-end',
    marginTop: 66,
},
code: {
    color: '#0c2550',
    fontSize: 20,
    marginTop: 20,
    marginBottom: 90,
},
selectWallet1: {
    marginBottom: 24,
    alignItems: 'center',
},
selectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
},
selectText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
},
selectWallet2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
},
selectWalletLabel: {
    color: '#0c2550',
    fontSize: 14,
},

modalContent: {
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 350,
    height: 350,
  },
  customAmount: {
    flexDirection: 'row',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  scrollBody: {
    marginTop: 32,
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  share: {
    justifyContent: 'flex-end',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  link: {
    marginVertical: 16,
    paddingHorizontal: 32,
  },
  amount: {
    fontWeight: '600',
    fontSize: 36,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 24,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 70,
    maxWidth: '80%',
    borderRadius: 50,
    fontWeight: '700',
  },
  customAmountText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
  },
});
  
  export default styles