if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' 's/classifier/archiveClassifier/g' node_modules/react-native-widget-center/android/build.gradle
else
    sed -i 's/classifier/archiveClassifier/g' node_modules/react-native-widget-center/android/build.gradle
fi
