#!/bin/sh

echo Uploading to Appetize and publishing link to Github...
echo "Branch "
BRANCH=`git ls-remote --heads origin | grep $(git rev-parse HEAD) | cut -d / -f 3`
echo $BRANCH
echo "Branch 2 "
git log -n 1 --pretty=%d HEAD | awk '{print $2}' | sed 's/origin\///' | sed 's/)//'

FILENAME="$APPCENTER_OUTPUT_DIRECTORY/app-release.apk"

if [ -f $FILENAME ]; then
    APTZ=`curl "https://$APPETIZE@api.appetize.io/v1/apps" -F "file=@$FILENAME" -F "platform=android"`
    echo Apptezize response:
    echo $APTZ
    APPURL=`node -e "let e = JSON.parse('$APTZ'); console.log(e.publicURL + '?device=pixel4');"`
    echo App url: $APPURL
    PR=`node scripts/appcenter-post-build-get-pr-number.js`
    echo PR: $PR

    DLOAD_APK="https://lambda-download-android-build.herokuapp.com/download/$BUILD_BUILDID"

    curl -X POST --data "{\"body\":\"♫ This was a triumph. I'm making a note here: HUGE SUCCESS ♫\n\n [android in browser] $APPURL\n\n[download apk]($DLOAD_APK) \"}"  -u "$GITHUB" "https://api.github.com/repos/BlueWallet/BlueWallet/issues/$PR/comments"
fi
