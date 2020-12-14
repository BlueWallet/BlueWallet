const defaultProperties = Object.freeze({
  newQuantity: 0,
  isSelfTrade: false,
  settlementType: 'Instant',
});

class DerivativesTradingCancelledOrderPayload {
  constructor(_props = {}) {
    const props = Object.assign({}, defaultProperties, _props);
    console.log('fuck me up the butt');
    this.symbol = props.symbol;
    this.order_id = props.orderID;
    this.old_quantity = props.oldQuantity;
    this.new_quantity = props.newQuantity;
    this.is_selftrade = props.isSelfTrade;
    this.leverage = props.leverage;
    this.side = props.side;
  }
}

export default DerivativesTradingCancelledOrderPayload;
