import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import ListItem from '../../components/ListItem'
import { useTheme } from '../../components/themes'
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation'
import loc from '../../loc'
import SafeAreaScrollView from '../../components/SafeAreaScrollView'
import { getPreferredProtocol, setPreferredProtocol, QRProtocol } from '../../blue_modules/bbqr'

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})

const protocols: Array<{ value: QRProtocol; label: string }> = [
  {
    value: 'bc-ur',
    label: loc.settings.qr_protocol_bc_ur,
  },
  {
    value: 'bbqr',
    label: 'BBQr',
  },
  {
    value: 'auto',
    label: loc.settings.qr_protocol_auto,
  },
]

const QRProtocolSettings: React.FC = () => {
  const [selectedProtocol, setSelectedProtocol] = useState<QRProtocol>('bc-ur')
  const { colors } = useTheme()
  const { goBack } = useExtendedNavigation()

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
  })

  const fetchProtocol = useCallback(async () => {
    try {
      const protocol = await getPreferredProtocol()
      setSelectedProtocol(protocol)
    } catch (error) {
      console.error('Error fetching QR protocol:', error)
      setSelectedProtocol('bc-ur')
    }
  }, [])

  useEffect(() => {
    fetchProtocol()
  }, [fetchProtocol])

  const handleProtocolPress = async (protocol: QRProtocol) => {
    try {
      await setPreferredProtocol(protocol)
      setSelectedProtocol(protocol)
      goBack()
    } catch (error) {
      console.error('Error saving QR protocol:', error)
    }
  }

  return (
    <SafeAreaScrollView style={[styles.root, stylesHook.root]} automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      {protocols.map(protocol => (
        <ListItem
          key={protocol.value}
          title={protocol.label}
          checkmark={selectedProtocol === protocol.value}
          onPress={() => handleProtocolPress(protocol.value)}
        />
      ))}
    </SafeAreaScrollView>
  )
}

export default QRProtocolSettings
