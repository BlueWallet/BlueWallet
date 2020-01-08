#!/usr/bin/env bash

echo Uploading to Appetize and publishing link to Github...
echo -n "Branch "
git ls-remote --heads origin | grep $(git rev-parse HEAD) | cut -d / -f 3
echo -n "Branch 2 "
git log -n 1 --pretty=%d HEAD | awk '{print $2}' | sed 's/origin\///' | sed 's/)//'

FILENAME="$APPCENTER_OUTPUT_DIRECTORY/app-release.apk"
FILENAME_IOS="$APPCENTER_OUTPUT_DIRECTORY/BlueWallet.ipa"

if [ -f $FILENAME ]; then
    APTZ=`curl "https://$APPETIZE@api.appetize.io/v1/apps" -F "file=@$FILENAME" -F "platform=android"`
    echo Apptezize response:
    echo $APTZ
    APPURL=`node -e "let e = JSON.parse('$APTZ'); console.log(e.publicURL);"`
    echo App url: $APPURL
    PR=`node appcenter-post-build-get-pr-number.js`
    echo PR: $PR

    # uploading file
    HASH=`date +%s`
    FILENAME_UNIQ="$APPCENTER_OUTPUT_DIRECTORY/$HASH.apk"
    cp "$FILENAME" "$FILENAME_UNIQ"
    curl "http://filestorage.bluewallet.io:1488/upload.php" -F "fileToUpload=@$FILENAME_UNIQ"
    rm "$FILENAME_UNIQ"
    DLOAD_APK="http://filestorage.bluewallet.io:1488/$HASH.apk"

    curl -X POST --data "{\"body\":\"♫ This was a triumph. I'm making a note here: HUGE SUCCESS ♫\n\n [android in browser] $APPURL\n\n[download apk]($DLOAD_APK) \"}"  -u "$GITHUB" "https://api.github.com/repos/BlueWallet/BlueWallet/issues/$PR/comments"
fi


if [ -f $FILENAME_IOS ]; then
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  # means we are building production IOS build. lets try to build sim build as well and upload it to appetize
  mv "$FILENAME_IOS" "$FILENAME_IOS.bak"
  rm -r -f ios/BlueWalletWatch
  rm -r -f ios/BlueWalletWatch\ Extension/
  rm -r -f ios/TodayExtension/
  xcodebuild -arch i386 -configuration Release -sdk iphonesimulator -workspace 'ios/BlueWallet.xcworkspace' -scheme 'BlueWallet'
  echo 'ios/build/Debug-iphonesimulator/    :'
  ls -lah ios/build/Debug-iphonesimulator/
  echo
  find  ./ | grep "\.app"

  mv "$FILENAME_IOS.bak" "$FILENAME_IOS"
fi