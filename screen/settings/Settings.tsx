import React, { useMemo, useLayoutEffect } from "react";
import { View, StyleSheet, Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PlatformListItem from "../../components/PlatformListItem";
import { useExtendedNavigation } from "../../hooks/useExtendedNavigation";
import loc from "../../loc";
import SafeAreaScrollView from "../../components/SafeAreaScrollView";
import { usePlatformStyles } from "../../theme/platformStyles";

const Settings = () => {
  const { navigate, setOptions } = useExtendedNavigation();
  const { colors, styles, layout, isAndroid, getIcon, sizing } =
    usePlatformStyles();
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  // Standard Android header is 56dp + status bar height
  const headerHeight = useMemo(() => {
    if (Platform.OS === "android" && insets.top > 0) {
      return 56 + (StatusBar.currentHeight || insets.top);
    }
    return 0;
  }, [insets.top]);

  useLayoutEffect(() => {
    setOptions({
      title: loc.settings.header,
      headerLargeTitle: true,
      headerLargeTitleStyle: {
        color: colors.titleColor || "#000000",
      },
      headerTitleStyle: {
        color: colors.titleColor || "#000000",
      },
      headerBackButtonDisplayMode: "minimal",
      headerBackTitle: "",
      headerBackTitleVisible: false,
      headerTransparent: true,
      headerBlurEffect: undefined,
      headerStyle: {
        backgroundColor: "transparent",
      },
    });
  }, [setOptions, colors.titleColor]);

  const settingsIcon = useMemo(() => getIcon("settings"), [getIcon]);
  const currencyIcon = useMemo(() => getIcon("currency"), [getIcon]);
  const languageIcon = useMemo(() => getIcon("language"), [getIcon]);
  const securityIcon = useMemo(() => getIcon("security"), [getIcon]);
  const networkIcon = useMemo(() => getIcon("network"), [getIcon]);
  const toolsIcon = useMemo(() => getIcon("tools"), [getIcon]);
  const aboutIcon = useMemo(() => getIcon("about"), [getIcon]);

  const localStyles = StyleSheet.create({
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginBottom: sizing.sectionContainerMarginBottom || 16,
      marginTop: isAndroid ? 8 : 0,
      marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
    },
    sectionContainer: {
      marginTop: isAndroid ? 16 : 8,
      marginBottom: sizing.sectionContainerMarginBottom || 16,
      marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
    },
    contentContainer: {
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
    },
    itemContainer: {
      marginHorizontal: 0,
    },
  });

  return (
    <SafeAreaScrollView
      testID="SettingsRoot"
      style={styles.container}
      contentContainerStyle={localStyles.contentContainer}
      nestedScrollEnabled={true}
      headerHeight={headerHeight}
    >
      <View style={localStyles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={settingsIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
          ]}
          onPress={() => navigate("GeneralSettings")}
          testID="GeneralSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />

        <PlatformListItem
          title={loc.settings.currency}
          leftIcon={currencyIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
          ]}
          onPress={() => navigate("Currency")}
          testID="Currency"
          chevron
          bottomDivider={layout.showBorderBottom}
        />

        <PlatformListItem
          title={loc.settings.language}
          leftIcon={languageIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
          ]}
          onPress={() => navigate("Language")}
          testID="Language"
          chevron
          bottomDivider={layout.showBorderBottom}
        />

        <PlatformListItem
          title={loc.settings.encrypt_title}
          leftIcon={securityIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
          ]}
          onPress={() => navigate("EncryptStorage")}
          testID="SecurityButton"
          chevron
          bottomDivider={layout.showBorderBottom}
        />

        <PlatformListItem
          title={loc.settings.network}
          leftIcon={networkIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
          ]}
          onPress={() => navigate("NetworkSettings")}
          testID="NetworkSettings"
          chevron
          bottomDivider={false}
          isLast
        />
      </View>

      <View style={localStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={toolsIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
          ]}
          onPress={() => navigate("SettingsTools")}
          testID="Tools"
          chevron
          bottomDivider={false}
          isFirst
          isLast
        />
      </View>

      <View style={localStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.about}
          leftIcon={aboutIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
          ]}
          onPress={() => navigate("About")}
          testID="AboutButton"
          chevron
          bottomDivider={false}
          isFirst
          isLast
        />
      </View>
    </SafeAreaScrollView>
  );
};

export default Settings;
