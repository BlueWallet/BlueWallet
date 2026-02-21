/* eslint-disable react/prop-types */
const React = require('react');

const VectorIconMock = ({ children }) => {
  return React.createElement('Text', null, children || 'Icon');
};

module.exports = VectorIconMock;
module.exports.default = VectorIconMock;
