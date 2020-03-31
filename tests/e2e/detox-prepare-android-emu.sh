$ANDROID_HOME/tools/bin/sdkmanager "system-images;android-28;default;x86_64"
echo no | $ANDROID_HOME/tools/bin/sdkmanager --licenses
echo no | $ANDROID_HOME/tools/bin/avdmanager create avd -n Pixel_API_29_AOSP --force --package "system-images;android-28;default;x86_64"
printf "\nhw.lcd.height=1334\nhw.lcd.width=750\nhw.lcd.density=320\nskin.name=750x1334" >> ~/.android/avd/Pixel_API_29_AOSP.avd/config.ini