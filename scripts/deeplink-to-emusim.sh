#!/bin/bash

deepLinks=()

prompt_for_single_value() {
  local prompt="$1"
  local input

  while true; do
    read -r -p "$prompt: " input
    input=$(echo "$input" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    if [[ -n "$input" ]]; then
      printf '%s' "$input"
      return
    fi

    echo -e "\n\033[1mA value is required. Please try again.\033[0m\n"
  done
}

prompt_for_notification_addresses() {
  local address

  echo -e "\n\033[1mEnter the wallet receive address to test notifications.\033[0m"
  address=$(prompt_for_single_value "Address")
  deepLinks=("$address")
}

prompt_for_send_targets() {
  local target

  echo -e "\n\033[1mEnter the deep link target to test.\033[0m"
  echo "Examples: bitcoin:..., lightning:..., bluewallet:setelectrumserver?..."
  target=$(prompt_for_single_value "Deep link")
  deepLinks=("$target")
}

testOptions=("Send" "Notification")
select_test_type() {
  local ESC=$(printf "\033")
  local selected=0
  while true; do
    clear
    echo -e "\n\033[1mSelect test type (Send or Notification):\033[0m\n"
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

if [[ "$TEST_TYPE" == "Notification" ]]; then
  prompt_for_notification_addresses
  selectedLink="${deepLinks[0]}"
else
  prompt_for_send_targets

  select_option() {
    local ESC=$(printf "\033")
    local selected=0

    while true; do
      clear
      echo -e "\n\033[1m[Test: $TEST_TYPE] Select a deep link:\033[0m\n"
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
    if [[ "$TEST_TYPE" == "Notification" ]]; then
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
    echo -e "\nSending deep link to Android emulator: $selectedLink\n"
    # Strip version info to get the emulator device ID
    emuId="${dev%% *}"
    adb -s "$emuId" shell am start -a android.intent.action.VIEW -d "$selectedLink"
  fi
  break
done