import React from 'react';
import { SectionList, SectionListData, StyleSheet, TouchableOpacity, View } from 'react-native';

import { images } from 'app/assets';
import { Text, Image } from 'app/components';
import { Contact } from 'app/consts';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface Props {
  contacts: Contact[];
  query: string;
  navigateToContactDetails: (contact: Contact) => void;
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
    <TouchableOpacity style={styles.contact} onPress={() => this.props.navigateToContactDetails(item)}>
      <Text style={styles.contactName}>{item.name}</Text>
    </TouchableOpacity>
  );

  renderSectionHeader = ({ section }: { section: SectionListData<Contact> }) => (
    <Text style={styles.header}>{section.title}</Text>
  );

  renderListEmpty = () => (
    <View style={styles.listEmptyContainer}>
      <Image source={images.addressBookNotFound} style={styles.listEmptyImage} />
      <Text style={styles.listEmptyText}>{`${i18n.contactList.noResults}"${this.props.query}"`}</Text>
    </View>
  );

  render() {
    return (
      <SectionList
        sections={this.sections}
        renderItem={this.renderItem}
        renderSectionHeader={this.renderSectionHeader}
        contentContainerStyle={styles.contentContainer}
        ListEmptyComponent={this.renderListEmpty}
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
  listEmptyContainer: {
    alignItems: 'center',
  },
  listEmptyImage: {
    width: 172,
    height: 139,
    marginTop: 44,
    marginBottom: 40,
  },
  listEmptyText: {
    ...typography.caption,
    color: palette.textGrey,
  },
});
