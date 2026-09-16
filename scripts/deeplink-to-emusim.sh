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

testOptions=("Send" "Send File" "Notification")
select_test_type() {
  local ESC=$(printf "\033")
  local selected=0
  while true; do
    clear
    echo -e "\n\033[1mSelect test type:\033[0m\n"
    for i in "${!testOptions[@]}"; do
      if [ $i -eq $selected ]; then
        echo "> ${testOptions[$i]}"
      else
        echo "  ${testOptions[$i]}"
      fi
    done
    read -rsn1 key
    if [[ $key == $ESC ]]; then
      read -rsn2 key
      case $key in
        '[A')
          ((selected--))
          if [ $selected -lt 0 ]; then
            selected=$((${#testOptions[@]} - 1))
          fi
          ;;
        '[B')
          ((selected++))
          if [ $selected -ge ${#testOptions[@]} ]; then
            selected=0
          fi
          ;;
      esac
    elif [[ $key == "" ]]; then
      TEST_TYPE="${testOptions[$selected]}"
      echo -e "\nSelected $TEST_TYPE test\n"
      break
    fi
  done
}
select_test_type

# For Notification mode, use only three bare bitcoin addresses
if [[ "$TEST_TYPE" == "Notification" ]]; then
  deepLinks=(
    "12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG"
    "bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7"
    "BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE"
  )
elif [[ "$TEST_TYPE" == "Send File" ]]; then
  deepLinks=("Open PSBT")
fi

select_option() {
  local ESC=$(printf "\033")
  local selected=0

  while true; do
    clear
    if [[ "$TEST_TYPE" == "Notification" ]]; then
      echo -e "\n\033[1m[Category: Receive] Select a deep link for notification:\033[0m\n"
    elif [[ "$TEST_TYPE" == "Send File" ]]; then
      echo -e "\n\033[1m[Category: Send File] Select a file action:\033[0m\n"
    else
      echo -e "\n\033[1m[Test: $TEST_TYPE] Select a deep link:\033[0m\n"
    fi
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

if [[ "$TEST_TYPE" == "Send File" ]]; then
  while true; do
    read -r -p "Path to the .psbt file: " selectedFile || exit 1
    case "$selectedFile" in
      "~/"*) selectedFile="$HOME/${selectedFile:2}" ;;
    esac
    case "$selectedFile" in
      *.[pP][sS][bB][tT])
        if [[ -f "$selectedFile" && -r "$selectedFile" ]]; then
          break
        fi
        ;;
    esac
    echo "Please enter the path to a readable .psbt file."
  done
fi

# Enumerate booted iOS simulators with OS versions
ios_sims=()
while IFS= read -r line; do
  if [[ $line =~ --\ (.*)\ -- ]]; then
    osVersion="${BASH_REMATCH[1]}"
  elif [[ $line =~ \(Booted\) ]]; then
    # trim leading whitespace
    raw=$(echo "$line" | sed 's/^[[:space:]]*//')
    # extract UDID (UUID format)
    udid=$(echo "$raw" | grep -oE '[A-F0-9-]{36}' | head -n1)
    if [[ -n "$udid" ]]; then
      name=$(echo "$raw" | sed -E "s/ \($udid\).*//")
      ios_sims+=("$name|$osVersion|$udid")
    fi
  fi
done < <(xcrun simctl list devices)

# Enumerate running Android emulators with OS versions
android_ids=($(adb devices | grep "device$" | awk '{print $1}'))
android_sims=()
for emu in "${android_ids[@]}"; do
  ver=$(adb -s "$emu" shell getprop ro.build.version.release 2>/dev/null)
  android_sims+=("$emu|$ver")
done

if [ ${#ios_sims[@]} -eq 0 ] && [ ${#android_sims[@]} -eq 0 ]; then
  echo -e "\n\033[1mNo running iOS simulators or Android emulators found.\033[0m\n"
  exit 1
fi

# Build a single list of devices for user selection
devices=()
for sim in "${ios_sims[@]}"; do
  IFS='|' read -r name os udid <<< "$sim"
  devices+=("iOS Simulator: $name ($os) [$udid]")
done
for emu in "${android_sims[@]}"; do
  IFS='|' read -r id ver <<< "$emu"
  devices+=("Android Emulator: $id (Android $ver)")
done

echo -e "\n\033[1mSelect the target device:\033[0m\n"
PS3=$'\nEnter the number corresponding to your choice: '
select device in "${devices[@]}"; do
  if [[ -z "$device" ]]; then
    echo -e "\n\033[1mInvalid selection. Please select again.\033[0m\n"
    continue
  fi
  platform="${device%%:*}"
  dev="${device#*: }"
  if [[ "$platform" == "iOS Simulator" ]]; then
    udid="${dev##*[}"
    udid="${udid%%]*}"
    if [[ "$TEST_TYPE" == "Send File" ]]; then
      app_container=$(xcrun simctl get_app_container "$udid" io.bluewallet.bluewallet data) || exit 1
      import_directory=$(mktemp -d "$app_container/tmp/psbt-import-XXXXXX") || exit 1
      cp -- "$selectedFile" "$import_directory/import.psbt" || exit 1
      selectedLink=$(node -e 'console.log(require("url").pathToFileURL(process.argv[1]).href)' "$import_directory/import.psbt") || exit 1
      echo -e "\nOpening PSBT on iOS simulator...\n"
      xcrun simctl openurl "$udid" "$selectedLink" || exit 1
    elif [[ "$TEST_TYPE" == "Notification" ]]; then
      echo -e "\nPreparing notification payload for address: $selectedLink\n"
      # dynamically build APNS payload with selected address
      read -r -d '' APNS_PAYLOAD << JSON
{
  "Simulator Target Bundle": "io.bluewallet.bluewallet",
  "aps": {
    "alert": {
      "title": "Transaction Received",
      "body": "You received 2000 satoshis to your address.",
      "action": "View Transaction"
    },
    "sound": "default",
    "badge": 1,
    "content-available": 1
  },
  "data": {
    "type": 2,
    "sat": 2000,
    "address": "$selectedLink",
    "txid": "sample_txid_2",
    "userInteraction": true,
    "foreground": false,
    "walletID": "wallet123",
    "chain": "ONCHAIN",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
JSON
      # write payload to temporary file
      apns_file=$(mktemp /tmp/bluewallet-apns-XXXXXX.apns)
      printf '%s' "$APNS_PAYLOAD" > "$apns_file"
      echo -e "Pushing notification to simulator $udid..."
      xcrun simctl push "$udid" "$apns_file"
      rm "$apns_file"
    else
      echo -e "\nSending deep link to iOS simulator: $selectedLink\n"
      xcrun simctl openurl "$udid" "$selectedLink"
    fi
  else
    # Strip version info to get the emulator device ID
    emuId="${dev%% *}"
    if [[ "$TEST_TYPE" == "Send File" ]]; then
      # A debug build lets us place the file in BlueWallet's own readable sandbox.
      app_directory=$(adb -s "$emuId" shell run-as io.bluewallet.bluewallet pwd | tr -d '\r')
      if [[ "$app_directory" != /data/* ]]; then
        echo "Sending a file requires a debuggable BlueWallet build on Android."
        exit 1
      fi
      remote_file="cache/psbt-import-$(date +%s)-$$.psbt"
      adb -s "$emuId" shell run-as io.bluewallet.bluewallet mkdir -p cache || exit 1
      adb -s "$emuId" shell "run-as io.bluewallet.bluewallet sh -c 'cat > $remote_file'" < "$selectedFile" || exit 1
      selectedLink="file://$app_directory/$remote_file"
      echo -e "\nOpening PSBT on Android emulator...\n"
      adb -s "$emuId" shell am start -n io.bluewallet.bluewallet/.MainActivity \
        -a android.intent.action.VIEW -t application/octet-stream -d "$selectedLink" || exit 1
    else
      echo -e "\nSending deep link to Android emulator: $selectedLink\n"
      adb -s "$emuId" shell am start -a android.intent.action.VIEW -d "$selectedLink"
    fi
  fi
  break
done