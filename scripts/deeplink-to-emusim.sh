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
optionLabels=("${deepLinks[@]}")

testOptions=("Send" "Notification" "Continuity")
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

if [[ "$TEST_TYPE" == "Notification" ]]; then
  deepLinks=(
    "12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG"
    "bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7"
    "BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE"
  )
  optionLabels=(
    "Notification: legacy address"
    "Notification: bech32 address"
    "Notification: uppercase bech32 address"
  )
elif [[ "$TEST_TYPE" == "Continuity" ]]; then
  deepLinks=(
    "bluewallet://receiveonchain/bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7"
    "bluewallet://receiveonchain"
    "bluewallet://xpub/wallet123/zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx"
    "bluewallet://xpub?xpub=zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx"
    "bluewallet://xpub/wallet123"
    "bluewallet://isitmyaddress/bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7"
    "bluewallet://isitmyaddress"
    "bluewallet://signverify/wallet123/bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7"
    "bluewallet://signverify?address=bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7"
    "bluewallet://signverify/wallet123"
    "bluewallet://sendonchain/wallet123?address=12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG&amount=0.001&amountSats=100000&transactionMemo=Test"
    "bluewallet://sendonchain/wallet123"
    "bluewallet://sendonchain/wallet123?address=12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG&amount=0.001&amountSats=100000&transactionMemo=ConflictTest"
    "bluewallet://lightningsettings?url=https%3A%2F%2Flndhub.herokuapp.com"
    "bluewallet://lightningsettings"
    "bluewallet://electrumsettings?server=electrum1.bluewallet.io%3A443%3As"
    "bluewallet://electrumsettings"
    "https://mempool.space/tx/abc123"
  )
  optionLabels=(
    "ReceiveOnchain: valid address (expect QR/import prompt)"
    "ReceiveOnchain: missing address (expect no-op)"
    "Xpub: valid walletID + xpub (expect QR/import prompt)"
    "Xpub: missing walletID (expect no-op)"
    "Xpub: missing xpub (expect no-op)"
    "IsItMyAddress: valid address"
    "IsItMyAddress: missing address (expect no-op)"
    "SignVerify: valid walletID + address"
    "SignVerify: missing walletID (expect no-op)"
    "SignVerify: missing address (expect no-op)"
    "SendOnchain: prefilled draft"
    "SendOnchain: wallet-only draft"
    "SendOnchain: conflict prompt (run while already on Send Details)"
    "LightningSettings: valid LNDHub URL"
    "LightningSettings: missing URL (expect no-op)"
    "ElectrumSettings: valid server"
    "ElectrumSettings: missing server (expect no-op)"
    "ViewInBlockExplorer: external URL behavior"
  )
fi

select_option() {
  local ESC=$(printf "\033")
  local selected=0

  while true; do
    clear
    if [[ "$TEST_TYPE" == "Notification" ]]; then
      echo -e "\n\033[1m[Category: Receive] Select a deep link for notification:\033[0m\n"
    else
      echo -e "\n\033[1m[Test: $TEST_TYPE] Select a deep link:\033[0m\n"
    fi
    for i in "${!deepLinks[@]}"; do
      label="${optionLabels[$i]:-${deepLinks[$i]}}"
      if [[ "$label" == *:* ]]; then
        titlePart="${label%%:*}"
        restPart="${label#*:}"
        formattedLabel="\033[1m${titlePart}:\033[0m${restPart}"
      else
        formattedLabel="\033[1m${label}\033[0m"
      fi

      if [ $i -eq $selected ]; then
        echo -e "> $formattedLabel"
        if [[ "$TEST_TYPE" == "Continuity" ]]; then
          echo "    ${deepLinks[$i]}"
        fi
      else
        echo -e "  $formattedLabel"
        if [[ "$TEST_TYPE" == "Continuity" ]]; then
          echo "    ${deepLinks[$i]}"
        fi
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
  selectedLabel="${optionLabels[$selected]:-${deepLinks[$selected]}}"
}

select_option

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
      echo -e "\nSending to iOS simulator: $selectedLabel\n$selectedLink\n"
      xcrun simctl openurl "$udid" "$selectedLink"
    fi
  else
    echo -e "\nSending to Android emulator: $selectedLabel\n$selectedLink\n"
    # Strip version info to get the emulator device ID
    emuId="${dev%% *}"
    adb -s "$emuId" shell am start -a android.intent.action.VIEW -d "$selectedLink"
  fi
  break
done