# React Native 64.0 requires all Android packages to have a minSdkVersion of at least 21
sed -i '' "s/minSdkVersion 16/minSdkVersion 21/" node_modules/react-native-secure-key-store/android/build.gradle
sed -i '' "s/minSdkVersion 16/minSdkVersion 21/" node_modules/@remobile/react-native-qrcode-local-image/android/build.gradle
sed -i '' "s/minSdkVersion 16/minSdkVersion 21/" node_modules/react-native-tor/android/build.gradle
sed -i '' "s/minSdkVersion 16/minSdkVersion 21/" node_modules/react-native-gesture-handler/android/lib/build.gradle

