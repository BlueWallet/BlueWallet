import { createRealmContext } from '@realm/react';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type Realm from 'realm';

import { BlueApp as BlueAppClass } from '../../class/blue-app';

const BlueApp = BlueAppClass.getInstance();
const WalletDataRealmContext = createRealmContext();

export const useWalletDataRealm = WalletDataRealmContext.useRealm;

type WalletDataQueryOptions<T extends Realm.Object<T>> = {
  type: string;
  query?: (collection: Realm.Results<T>) => Realm.Results<T>;
  keyPaths?: string | string[];
};

const identityQuery = <T extends Realm.Object<T>>(collection: Realm.Results<T>) => collection;

/** Keeps a Realm Results query live while allowing the backing bucket to change. */
export function useWalletDataQuery<T extends Realm.Object<T>>(
  options: WalletDataQueryOptions<T> | string,
  dependencies: React.DependencyList = [],
): Realm.Results<T> {
  const realm = useWalletDataRealm();
  const type = typeof options === 'string' ? options : options.type;
  const query = typeof options === 'string' ? identityQuery<T> : (options.query ?? identityQuery<T>);
  const keyPaths = typeof options === 'string' ? undefined : options.keyPaths;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableQuery = useCallback(query, [type, ...dependencies]);
  const results = useMemo(() => stableQuery(realm.objects<T>(type)), [realm, stableQuery, type]);
  const [version, notify] = useReducer(value => value + 1, 0);

  useEffect(() => {
    const listener = () => notify();
    results.addListener(listener, keyPaths);
    return () => {
      if (!realm.isClosed) results.removeListener(listener);
    };
  }, [keyPaths, realm, results]);

  // A notification deliberately replaces the proxy even though Results itself is live.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new Proxy(results, {}), [results, version]);
}

/** Primary-key lookup built on the bucket-aware query wrapper above. */
export function useWalletDataObject<T extends Realm.Object<T>>(type: string, primaryKey: string): T | null {
  const realm = useWalletDataRealm();
  const primaryKeyProperty = realm.schema.find(schema => schema.name === type)?.primaryKey;
  const rows = useWalletDataQuery<T>(
    {
      type,
      query: collection => {
        if (!primaryKeyProperty) throw new Error(`Realm schema ${type} has no primary key`);
        return collection.filtered(`${primaryKeyProperty} == $0`, primaryKey);
      },
    },
    [primaryKey, primaryKeyProperty],
  );
  return rows[0] ?? null;
}

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
