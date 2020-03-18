#!/usr/bin/env bash

echo uploading artifacts...
cp ./android/app/build/outputs/apk/release/app-release.apk ./artifacts/
cp ./android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk ./artifacts/
cp ~/.android/avd/Pixel_API_29_AOSP.avd/config.ini ./artifacts/
tar -cvzf artifacts.tar.gz artifacts
FILENAME="artifacts.tar.gz"
HASH=`date +%s`
FILENAME_UNIQ="$HASH.tar.gz"
cp "$FILENAME" "$FILENAME_UNIQ"
curl "http://filestorage.bluewallet.io:1488/upload.php" -F "fileToUpload=@$FILENAME_UNIQ"
rm "$FILENAME_UNIQ"
DLOAD="http://filestorage.bluewallet.io:1488/$HASH.tar.gz"
echo artifacts download link:
echo $DLOAD