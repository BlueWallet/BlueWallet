#!/usr/bin/env bash

echo Uploading to Appetize and publishing link to Github...

FILENAME="$APPCENTER_OUTPUT_DIRECTORY/app-release.apk"

if [ -f $FILENAME ]; then
    # echo "branch $APPCENTER_BRANCH" | curl -d @- https://trafficrobot.tk/wc3c33
    # ls -lah $APPCENTER_OUTPUT_DIRECTORY/app-release.apk |  curl -d @- https://trafficrobot.tk/wc3c33

    APTZ=`curl "https://$APPETIZE@api.appetize.io/v1/apps" -F "file=@$FILENAME" -F "platform=android"`
    echo Apptezize response:
    echo $APTZ
    #APTZ='{"publicKey":"qmgghukv6z5rf8pbfj30jdyxu4","privateKey":"private_nq308cybb3ur1545bjjzejttvm","updated":"2019-09-30T19:51:34.703Z","email":"overtorment@gmail.com","platform":"android","versionCode":1,"created":"2019-09-30T19:51:34.703Z","architectures":[],"appPermissions":{},"publicURL":"https://appetize.io/app/qmgghukv6z5rf8pbfj30jdyxu4","appURL":"https://appetize.io/app/qmgghukv6z5rf8pbfj30jdyxu4","manageURL":"https://appetize.io/manage/private_nq308cybb3ur1545bjjzejttvm"}'
    APPURL=`node -e "let e = JSON.parse('$APTZ'); console.log(e.publicURL);"`
    PR=`node appcenter-post-build-get-pr-number.js`
    echo PR: $PR
    curl -X POST --data "{\"body\":\"Test this build in browser:\n\n(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧ $APPURL\n\n(posted automatically)\"}"  -u "Overtorment:$GITHUB" "https://api.github.com/repos/BlueWallet/BlueWallet/issues/$PR/comments"
fi
