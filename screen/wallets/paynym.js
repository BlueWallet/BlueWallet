import Frisbee from 'frisbee';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';

export function PayNym({ paymentCode }) {
  async function createPayNym(paymentCode) {
    const api = new Frisbee({
      baseURI: 'https://paynym.is/api/v1',
    });

    const res = await api.post('/create', {
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        code: paymentCode,
      },
    });

    return res.body.nymName;
  }

  const [paynym, setPaynym] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const paynym = await createPayNym(paymentCode);
      setPaynym(paynym);
      setLoading(false);
    })();
  }, [paymentCode]);

  return (
    <>
      {loading && <ActivityIndicator />}
      {!loading && <BlueText>{paynym}</BlueText>}
    </>
  );
}

PayNym.propTypes = {
  paymentCode: PropTypes.string.isRequired,
};
