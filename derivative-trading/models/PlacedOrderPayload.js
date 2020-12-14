import { MarginType } from './TradingTypes';
import 'react-native-get-random-values'; // https://github.com/uuidjs/uuid#react-native
import { v4 as uuidV4 } from 'uuid';

const defaultProperties = Object.freeze({
  marginType: MarginType.ISOLATED,
  quantity: 1,
  leverage: 1,
});

class DerivativesTradingPlacedOrderPayload {
  constructor(_props = {}) {
    const props = Object.assign({}, defaultProperties, _props);

    this.symbol = props.symbol;
    this.side = props.side;
    this.order_type = props.orderType;
    this.margin_type = props.marginType;
    this.price = Number(props.price);
    this.quantity = props.quantity;
    this.leverage = props.leverage * 100; // The API will add two decimal points to whatever we send.
    this.ext_order_id = uuidV4();
  }
}

export default DerivativesTradingPlacedOrderPayload;
