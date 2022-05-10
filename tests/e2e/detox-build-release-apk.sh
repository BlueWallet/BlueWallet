# script thats used to build & sign release APK in preparation for Detox e2e testing.
# should be copied in package.json - detox  - configurations - android.emu.release - build

# deleting old artifacts
find | grep '\.apk' --color=never | grep -v node_modules | xargs -l rm

# creating fresh keystore
rm detox.keystore
keytool -genkeypair -v -keystore detox.keystore -alias detox  -keyalg RSA -keysize 2048 -validity 10000 -storepass 123456 -keypass 123456 -dname  'cn=Unknown, ou=Unknown, o=Unknown, c=Unknown'

# building release APK
cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd ..

# backup & sign apk1
cp ./android/app/build/outputs/apk/release/app-release-unsigned.apk ./android/app/build/outputs/apk/release/app-release-unsigned.apk.bak
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore detox.keystore ./android/app/build/outputs/apk/release/app-release-unsigned.apk  detox -storepass 123456

# move apk1 to expected filename
mv ./android/app/build/outputs/apk/release/app-release-unsigned.apk ./android/app/build/outputs/apk/release/app-release.apk

# backup and sign apk2
cp android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk.bak
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore detox.keystore android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk   detox -storepass 123456



# why the fuck there are 2 apks..? oh well, if it works - dont touch