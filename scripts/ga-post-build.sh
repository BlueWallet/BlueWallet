#!/bin/sh

echo Uploading to Appetize and publishing link to Github...
echo -n "Branch "
BRANCH=`./scripts/current-branch.sh | tr -d '"'`
echo $BRANCH

FILENAME="./android/app/build/outputs/apk/release/app-release.apk"

if [ -f $FILENAME ]; then
    APTZ=`curl "https://$APPETIZE@api.appetize.io/v1/apps" -F "file=@$FILENAME" -F "platform=android"`
    echo Apptezize response:
    echo $APTZ
    APPURL=`node -e "let e = JSON.parse('$APTZ'); console.log(e.publicURL + '?device=pixel4');"`
    echo App url: $APPURL
    PR=`node scripts/ga-post-build-get-pr-number.js`
    echo PR: $PR

    DLOAD_APK="http://lambda-download-android-build.herokuapp.com/downloadArtifactForBranch/$BRANCH"

    curl -X POST --data "{\"body\":\"♫ This was a triumph. I'm making a note here: HUGE SUCCESS ♫\n\n [android in browser] $APPURL\n\n[download apk]($DLOAD_APK) \"}"  -u "$GITHUB" "https://api.github.com/repos/BlueWallet/BlueWallet/issues/$PR/comments"
fi
