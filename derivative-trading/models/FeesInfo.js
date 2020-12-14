const defaultProperties = {
  maker: 0,
  taker: 0,
};

export default class DerivativesTradingFeesInfo {
  constructor(_props = {}) {
    const props = Object.assign({}, defaultProperties, _props);

    this.maker = props.maker;
    this.taker = props.taker;
  }
}