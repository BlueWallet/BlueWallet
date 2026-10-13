import React, { useState } from 'react';
import { Split } from 'react-native-screens/experimental';
import { SplitLayoutProvider } from '../components/Context/SplitLayoutContext';
import useCompanionListeners from '../hooks/useCompanionListeners';
import { WalletsListSidebar } from '../screen/wallets/WalletsList';
import DetailViewStackScreensStack from './DetailViewScreensStack';

const DrawerRoot = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  useCompanionListeners();
  return (
    <Split.Host onCollapse={() => setIsExpanded(false)} onExpand={() => setIsExpanded(true)} topColumnForCollapsing="secondary">
      <Split.Column>
        <SplitLayoutProvider isExpanded={isExpanded} column="primary">
          <WalletsListSidebar />
        </SplitLayoutProvider>
      </Split.Column>
      <Split.Column>
        <SplitLayoutProvider isExpanded={isExpanded} column="secondary">
          <DetailViewStackScreensStack />
        </SplitLayoutProvider>
      </Split.Column>
    </Split.Host>
  );
};
export default DrawerRoot;
