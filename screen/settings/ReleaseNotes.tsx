import React from 'react';
import { ScrollView } from 'react-native';

import { BlueCard, BlueText } from '../../BlueComponents';

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
