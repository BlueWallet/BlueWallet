#!/bin/bash

deepLinks=(
  "bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG"
  "bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo"
  "BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE"
  "bluewallet:bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG"
  "lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde"
  "bluewallet:lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde"
  "https://azte.co/?c1=3062&c2=2586&c3=5053&c4=5261"
  "https://azte.co/redeem?code=1111222233334444"
  "bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As"
  "bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com"
  "lnaddress@zbd.gg"
  "zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx"
)

select_option() {
  local ESC=$(printf "\033")
  local selected=0

  while true; do
    clear
    echo -e "\n\033[1mSelect a deep link using the up/down arrow keys and press Enter to confirm:\033[0m\n"
    for i in "${!deepLinks[@]}"; do
      if [ $i -eq $selected ]; then
        echo "> ${deepLinks[$i]}"
      else
        echo "  ${deepLinks[$i]}"
      fi
    done

    read -rsn1 key
    if [[ $key == $ESC ]]; then
      read -rsn2 key
      case $key in
        '[A') # Up arrow
          ((selected--))
          if [ $selected -lt 0 ]; then
            selected=$((${#deepLinks[@]} - 1))
          fi
          ;;
        '[B') # Down arrow
          ((selected++))
          if [ $selected -ge ${#deepLinks[@]} ]; then
            selected=0
          fi
          ;;
      esac
    elif [[ $key == "" ]]; then
      break
    fi
  done

  selectedLink="${deepLinks[$selected]}"
}

select_option

ios_sims=$(xcrun simctl list devices | grep -w "Booted" | awk -F '[()]' '{print $2}')
android_emus=$(adb devices | grep "device$" | awk '{print $1}')

if [ -z "$ios_sims" ] && [ -z "$android_emus" ]; then
  echo -e "\n\033[1mNo running iOS simulators or Android emulators found.\033[0m\n"
  exit 1
fi

echo -e "\n\033[1mSelect the target device:\033[0m\n"
PS3=$'\nEnter the number corresponding to your choice: '
options=("iOS Simulator" "Android Emulator")

select device in "${options[@]}"; do
  if [ "$device" == "iOS Simulator" ]; then
    echo -e "\nSending deep link to iOS simulator: $selectedLink\n"
    xcrun simctl openurl booted "$selectedLink"
    break
  elif [ "$device" == "Android Emulator" ]; then
    if [ $(echo "$android_emus" | wc -l) -eq 1 ]; then
      echo -e "\nSending deep link to Android emulator: $selectedLink\n"
      adb shell am start -a android.intent.action.VIEW -d "$selectedLink"
    else
      echo -e "\n\033[1mSelect an Android emulator:\033[0m\n"
      select emu in $android_emus; do
        echo -e "\nSending deep link to Android emulator: $selectedLink\n"
        adb -s "$emu" shell am start -a android.intent.action.VIEW -d "$selectedLink"
        break
      done
    fi
    break
  else
    echo -e "\n\033[1mInvalid option. Please select again.\033[0m\n"
  fi
done