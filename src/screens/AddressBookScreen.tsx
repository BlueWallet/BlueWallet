import React, { PureComponent } from 'react';

import { ListEmptyState } from 'app/components';

export class AddressBookScreen extends PureComponent {
  render() {
    return <ListEmptyState variant={ListEmptyState.Variant.AddressBook} onPress={() => {}} />;
  }
}
