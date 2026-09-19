/* eslint-disable react/prop-types */
const React = require('react');

const VectorIconMock = ({ children, ...props }) => {
  return React.createElement('Text', props, children || 'Icon');
};

module.exports = VectorIconMock;
module.exports.default = VectorIconMock;
