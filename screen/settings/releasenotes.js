import React from 'react';
import { ScrollView } from 'react-native';

import { BlueCard, BlueText } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import SafeArea from '../../components/SafeArea';
import loc from '../../loc';

const ReleaseNotes = () => {
  const notes = require('../../release-notes');

  return (
    <SafeArea>
      <ScrollView>
        <BlueCard>
          <BlueText>{notes}</BlueText>
        </BlueCard>
      </ScrollView>
    </SafeArea>
  );
};

ReleaseNotes.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: loc.settings.about_release_notes }));

export default ReleaseNotes;
