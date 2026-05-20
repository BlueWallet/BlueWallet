import React from 'react';
import { ScrollView } from 'react-native';

import BlueCard from '../../components/BlueCard';
import BlueText from '../../components/BlueText';
const ReleaseNotes: React.FC = () => {
  const notes = require('../../release-notes');

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets>
      <BlueCard>
        <BlueText>{notes}</BlueText>
      </BlueCard>
    </ScrollView>
  );
};

export default ReleaseNotes;
