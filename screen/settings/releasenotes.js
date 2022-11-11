import React from 'react';
import { ScrollView } from 'react-native';
import navigationStyle from '../../components/navigationStyle';
import { SafeBlueArea, BlueCard, BlueText } from '../../BlueComponents';
import loc from '../../loc';

const ReleaseNotes = () => {
  const notes = require('../../release-notes');

  return (
    <SafeBlueArea>
      <ScrollView>
        <BlueCard>
          <BlueText>{notes}</BlueText>
        </BlueCard>
      </ScrollView>
    </SafeBlueArea>
  );
};

ReleaseNotes.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: loc.settings.about_release_notes }));

export default ReleaseNotes;
