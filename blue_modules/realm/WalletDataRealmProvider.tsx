import { createRealmContext } from '@realm/react';
import React, { useEffect, useRef, useState } from 'react';
import type Realm from 'realm';

import { BlueApp as BlueAppClass } from '../../class/blue-app';

const BlueApp = BlueAppClass.getInstance();
const WalletDataRealmContext = createRealmContext();

export const useWalletDataRealm = WalletDataRealmContext.useRealm;
export const useWalletDataQuery = WalletDataRealmContext.useQuery;
export const useWalletDataObject = WalletDataRealmContext.useObject;

/** Provides live canonical transactions, UTXOs, metadata, and wallet ordering. */
export const WalletDataRealmProvider = ({ children }: React.PropsWithChildren) => {
  const [realm, setRealm] = useState<Realm>();
  const committedRealm = useRef<Realm | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = BlueApp.subscribeToAppDataRealm(nextRealm => {
      if (mounted) setRealm(nextRealm);
    });

    BlueApp.getWalletDataRealmForProvider().catch(error =>
      console.warn('[WalletDataRealmProvider] Failed to open wallet data Realm:', error),
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const previousRealm = committedRealm.current;
    committedRealm.current = realm;
    if (previousRealm && previousRealm !== realm) BlueApp.releaseAppDataRealm(previousRealm);
  }, [realm]);

  if (!realm || realm.isClosed) return null;
  return <WalletDataRealmContext.RealmProvider realm={realm}>{children}</WalletDataRealmContext.RealmProvider>;
};
