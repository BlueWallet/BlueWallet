import { createRealmContext } from '@realm/react';
import React, { useEffect, useRef, useState } from 'react';
import type Realm from 'realm';

import { BlueApp as BlueAppClass } from '../../class/blue-app';

const BlueApp = BlueAppClass.getInstance();
const AppDataRealmContext = createRealmContext();

export const useAppDataRealm = AppDataRealmContext.useRealm;
export const useAppDataQuery = AppDataRealmContext.useQuery;
export const useAppDataObject = AppDataRealmContext.useObject;

/** Provides the encrypted, bucket-specific Realm already owned by BlueApp. */
export const AppDataRealmProvider = ({ children }: React.PropsWithChildren) => {
  const [realm, setRealm] = useState<Realm>();
  const committedRealm = useRef<Realm | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = BlueApp.subscribeToAppDataRealm(nextRealm => {
      if (mounted) setRealm(nextRealm);
    });

    BlueApp.getRealmForTransactions().catch(error => console.warn('[AppDataRealmProvider] Failed to open app data Realm:', error));

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
  return <AppDataRealmContext.RealmProvider realm={realm}>{children}</AppDataRealmContext.RealmProvider>;
};
