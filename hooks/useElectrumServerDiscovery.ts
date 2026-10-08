import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Platform } from 'react-native';
import { openSettings } from 'react-native-permissions';

import * as BlueElectrum from '../blue_modules/BlueElectrum';
import electrumDiscoveryEvents from '../blue_modules/electrumDiscoveryEvents';
import NativeWidgetHelper from '../blue_modules/NativeWidgetHelper';
import { ElectrumServerItem, parseElectrumServer, uniqueElectrumServers } from '../blue_modules/electrumServer';
import loc from '../loc';

type DiscoveredServerRecord = {
  host?: string;
  port?: number;
  ssl?: boolean;
};

const MAX_DISCOVERY_PAYLOAD_LENGTH = 1_000_000;
const MAX_DISCOVERED_SERVERS = 1_000;
const DISCOVERY_TIMEOUT_MS = 15_000;
const DISCOVERY_EVENT = 'onElectrumServerDiscovered';

const discoverWithTimeout = async (): Promise<string> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      NativeWidgetHelper.discoverElectrumServers(),
      new Promise<string>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Electrum server discovery timed out.')), DISCOVERY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const parseDiscoveredElectrumServers = (json: string): ElectrumServerItem[] => {
  if (typeof json !== 'string' || json.length > MAX_DISCOVERY_PAYLOAD_LENGTH) throw new Error('Invalid discovery response.');
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error('Invalid discovery response.');

  const servers = parsed.slice(0, MAX_DISCOVERED_SERVERS).flatMap(record => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return [];
    const { host, port, ssl } = record as DiscoveredServerRecord;
    if (typeof host !== 'string' || !Number.isInteger(port) || Number(port) < 1 || Number(port) > 65_535 || typeof ssl !== 'boolean') {
      return [];
    }
    const server = parseElectrumServer(`${host} ${port} ${ssl ? 'ssl' : 'tcp'}`);
    return server ? [server] : [];
  });

  return uniqueElectrumServers(servers);
};

const useElectrumServerDiscovery = () => {
  const [discoveredServers, setDiscoveredServers] = useState<ElectrumServerItem[]>([]);
  const [isDiscoveringServers, setIsDiscoveringServers] = useState(false);
  const [hasStartedDiscovery, setHasStartedDiscovery] = useState(false);
  const discoveryInFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const performServerDiscovery = useCallback(async () => {
    if (discoveryInFlight.current) return;
    discoveryInFlight.current = true;
    setIsDiscoveringServers(true);

    try {
      if (Platform.OS === 'ios') {
        let permissionStatus: string;
        try {
          permissionStatus = await NativeWidgetHelper.requestLocalNetworkPermission();
        } catch {
          permissionStatus = 'unavailable';
        }
        if (permissionStatus !== 'granted') {
          if (!mounted.current) return;
          Alert.alert(loc.settings.electrum_discovery_permission_denied, loc.settings.electrum_discovery_permission_denied_message, [
            { text: loc._.cancel, style: 'cancel' },
            {
              text: loc.send.open_settings,
              onPress: () => openSettings('application').catch(() => undefined),
            },
          ]);
          return;
        }
      }

      if (!mounted.current) return;
      setHasStartedDiscovery(true);
      setDiscoveredServers([]);

      const candidateKeys = new Set<string>();
      const pendingValidations = new Set<Promise<void>>();
      let discoveredCount = 0;
      const validateCandidate = (candidate: ElectrumServerItem) => {
        const key = `${candidate.host}:${candidate.tcp ?? ''}:${candidate.ssl ?? ''}`;
        if (candidateKeys.has(key)) return;
        candidateKeys.add(key);
        const validation = BlueElectrum.validateConnection(candidate.host, candidate.tcp, candidate.ssl)
          .then(result => {
            if (!result.success || !mounted.current) return;
            discoveredCount += 1;
            setDiscoveredServers(current => uniqueElectrumServers([...current, candidate]));
            AccessibilityInfo.announceForAccessibility(
              loc.formatString(loc.settings.electrum_discovery_found_announcement, { server: candidate.host }),
            );
          })
          .catch(() => undefined)
          .finally(() => pendingValidations.delete(validation));
        pendingValidations.add(validation);
      };
      const subscription = electrumDiscoveryEvents.addListener(DISCOVERY_EVENT, (record: DiscoveredServerRecord) => {
        try {
          parseDiscoveredElectrumServers(JSON.stringify([record])).forEach(validateCandidate);
        } catch {
          // Ignore malformed native events while the remaining scan continues.
        }
      });

      try {
        const json = await discoverWithTimeout();
        parseDiscoveredElectrumServers(json).forEach(validateCandidate);
        await Promise.allSettled([...pendingValidations]);
        if (mounted.current) {
          AccessibilityInfo.announceForAccessibility(
            discoveredCount === 0
              ? loc.settings.electrum_discovery_complete_none_announcement
              : discoveredCount === 1
                ? loc.settings.electrum_discovery_complete_one_announcement
                : loc.formatString(loc.settings.electrum_discovery_complete_announcement, { count: String(discoveredCount) }),
          );
        }
      } finally {
        subscription.remove();
      }
    } catch {
      // Keep any progressively discovered results. A scan only clears results
      // when the user explicitly starts it, never because a later source fails.
    } finally {
      discoveryInFlight.current = false;
      if (mounted.current) setIsDiscoveringServers(false);
    }
  }, []);

  const discoverServers = useCallback(() => {
    if (discoveryInFlight.current) return;
    Alert.alert(
      loc.settings.electrum_discovery_permission_title,
      Platform.OS === 'ios'
        ? loc.settings.electrum_discovery_permission_message
        : loc.settings.electrum_discovery_permission_message_android,
      [
        { text: loc._.cancel, style: 'cancel' },
        {
          text: loc.settings.electrum_discovery_continue,
          onPress: performServerDiscovery,
        },
      ],
    );
  }, [performServerDiscovery]);

  const retryDiscovery = useCallback(() => {
    performServerDiscovery();
  }, [performServerDiscovery]);

  return {
    discoveredServers,
    isDiscoveringServers,
    hasStartedDiscovery,
    discoverServers,
    retryDiscovery,
  };
};

export default useElectrumServerDiscovery;
