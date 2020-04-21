import React from 'react';
import { SectionList, SectionListData, StyleSheet, TouchableOpacity } from 'react-native';

import { Text } from 'app/components';
import { Contact } from 'app/consts';
import { palette, typography } from 'app/styles';

interface Props {
  contacts: Contact[];
}

export class ContactList extends React.PureComponent<Props> {
  get sections(): ReadonlyArray<SectionListData<Contact>> {
    const sections = {};
    this.props.contacts
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(contact => {
        const firstLetter = contact.name.charAt(0);
        if (sections[firstLetter]) {
          sections[firstLetter].push(contact);
        } else {
          sections[firstLetter] = [contact];
        }
      });
    return Object.entries(sections).map(([key, value]) => ({
      title: key,
      data: value as Contact[],
    }));
  }

  renderItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity style={styles.contact}>
      <Text style={styles.contactName}>{item.name}</Text>
    </TouchableOpacity>
  );

  renderSectionHeader = ({ section }: { section: SectionListData<Contact> }) => (
    <Text style={styles.header}>{section.title}</Text>
  );

  render() {
    return (
      <SectionList
        sections={this.sections}
        renderItem={this.renderItem}
        renderSectionHeader={this.renderSectionHeader}
        contentContainerStyle={styles.contentContainer}
      />
    );
  }
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  header: {
    paddingVertical: 16,
    color: palette.textGrey,
  },
  contact: {
    paddingVertical: 8,
  },
  contactName: {
    ...typography.headline5,
  },
});
