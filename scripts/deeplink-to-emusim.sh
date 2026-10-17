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

# One compact menu for every step; keep long payloads out of the choices.
bold='' cyan='' reset=''
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  bold=$'\033[1m'; cyan=$'\033[36m'; reset=$'\033[0m'
fi
trap 'printf "\nCancelled.\n"; exit 130' INT
choose() {
  local title="$1" answer i
  shift
  local options=("$@")
  printf '\n%s%s%s\n' "$bold" "$title" "$reset"
  for i in "${!options[@]}"; do
    printf '  %s%2d%s  %s\n' "$cyan" "$((i + 1))" "$reset" "${options[$i]}"
  done
  while true; do
    printf '\nChoose 1–%s, or q to quit: ' "${#options[@]}"
    IFS= read -r answer || exit 0
    [[ "$answer" == q || "$answer" == Q ]] && exit 0
    if [[ "$answer" =~ ^[0-9]{1,2}$ ]] && ((10#$answer >= 1 && 10#$answer <= ${#options[@]})); then
      selected=$((10#$answer - 1))
      return
    fi
    printf 'Enter one of the listed numbers.\n'
  done
}
printf '\n%sBlueWallet · Simulator tools%s\n' "$bold" "$reset"
testOptions=("Send" "Notification" "Send Sample File")
choose "1 / 3 · Choose a test" "Open a deep link" "Receive a notification (iOS)" "Preview a sample file"
TEST_TYPE="${testOptions[$selected]}"

# For Notification mode, use only three bare bitcoin addresses
if [[ "$TEST_TYPE" == "Notification" ]]; then
  deepLinks=(
    "12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG"
    "bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7"
    "BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE"
  )
fi

if [[ "$TEST_TYPE" == "Send Sample File" ]]; then
  deepLinks=("PSBT" "TXN" "bwcoord" "jsonl")
fi

if [[ "$TEST_TYPE" == "Send Sample File" ]]; then
  labels=("PSBT · Partially signed transaction" "TXN · Bitcoin transaction" "bwcoord · Multisig vault (2 of 3)" "JSONL · Wallet labels")
elif [[ "$TEST_TYPE" == "Notification" ]]; then
  labels=("Legacy address" "Native SegWit address" "Uppercase SegWit address")
else
  labels=("Bitcoin · Legacy address" "Bitcoin · Amount and label" "Bitcoin · Uppercase SegWit" "BlueWallet · Bitcoin address" "Lightning · Invoice" "BlueWallet · Lightning invoice" "Azte · Voucher" "Azte · Redeem code" "Settings · Electrum server" "Settings · LNDHub server" "Lightning · Address" "Wallet · Extended public key")
fi
choose "2 / 3 · Choose a sample" "${labels[@]}"
selectedLink="${deepLinks[$selected]}"
selectedLabel="${labels[$selected]}"

if [[ "$TEST_TYPE" == "Send Sample File" ]]; then
  script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd) || exit 1
  extension=$(printf '%s' "$selectedLink" | tr '[:upper:]' '[:lower:]')
  sample_name="quicklook-preview-sample.$extension"
  sample_file="$script_dir/../tests/unit/fixtures/$sample_name"
  if [[ ! -f "$sample_file" ]]; then
    echo "Sample file not found: $sample_file" >&2
    exit 1
  fi
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
done < <(if command -v xcrun >/dev/null 2>&1; then xcrun simctl list devices 2>/dev/null; fi)

# Enumerate running Android emulators with OS versions
android_ids=()
if [[ "$TEST_TYPE" != "Notification" ]] && command -v adb >/dev/null 2>&1; then
  while IFS= read -r id; do android_ids+=("$id"); done < <(adb devices 2>/dev/null | awk '$2 == "device" {print $1}')
fi
android_sims=()
for emu in "${android_ids[@]}"; do
  ver=$(adb -s "$emu" shell getprop ro.build.version.release 2>/dev/null)
  android_sims+=("$emu|$ver")
done

if [ ${#ios_sims[@]} -eq 0 ] && [ ${#android_sims[@]} -eq 0 ]; then
  printf '\nNo compatible running devices. Start an iOS simulator or Android emulator.\n'
  exit 1
fi

# Build a single list of devices for user selection
devices=()
for sim in "${ios_sims[@]}"; do
  IFS='|' read -r name os udid <<< "$sim"
  devices+=("iOS Simulator: $name ($os)")
done
for emu in "${android_sims[@]}"; do
  IFS='|' read -r id ver <<< "$emu"
  devices+=("Android Emulator: $id (Android $ver)")
done

choose "3 / 3 · Choose a device" "${devices[@]}"
device="${devices[$selected]}"
printf '\n%sRunning%s  %s\n         %s\n' "$bold" "$reset" "$selectedLabel" "$device"
platform="${device%%:*}"
dev="${device#*: }"
if [[ "$platform" == "iOS Simulator" ]]; then
  IFS='|' read -r name os udid <<< "${ios_sims[$selected]}"
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
    apns_file=$(mktemp -t bluewallet-apns) || exit 1
    printf '%s' "$APNS_PAYLOAD" > "$apns_file"
    echo -e "Pushing notification to simulator $udid..."
    xcrun simctl push "$udid" "$apns_file"
    push_status=$?
    rm "$apns_file"
    [[ $push_status -eq 0 ]] || exit "$push_status"
  elif [[ "$TEST_TYPE" == "Send Sample File" ]]; then
    app_container=$(xcrun simctl get_app_container "$udid" io.bluewallet.bluewallet data) || exit 1
    # Use a regular Documents folder for Files preview testing. An existing
    # Inbox entry silently failed in the simulator while a fresh copy of the
    # same sample outside Inbox opened successfully.
    sample_directory="$app_container/Documents/Quick Look Samples"
    destination="$sample_directory/$sample_name"
    mkdir -p "$sample_directory" || exit 1
    cp "$sample_file" "$destination" || exit 1
    # Open the folder in Files instead of routing the file to BlueWallet import.
    # Escape reserved characters, including spaces in home paths.
    file_url="${sample_directory//%/%25}"
    file_url="${file_url// /%20}"
    file_url="${file_url//#/%23}"
    file_url="${file_url//\?/%3F}"
    echo -e "\nSample ready in Files > On My iPhone > BlueWallet > Quick Look Samples: $sample_name\n"
    xcrun simctl openurl "$udid" "shareddocuments://$file_url/" || exit 1
  else
    printf 'Opening the selected link…\n'
    xcrun simctl openurl "$udid" "$selectedLink" || exit 1
  fi
else
  # Strip version info to get the emulator device ID
  emuId="${dev%% *}"
  if [[ "$TEST_TYPE" == "Send Sample File" ]]; then
    destination="/sdcard/Download/$sample_name"
    echo -e "\nSending sample file to Android emulator: $sample_name\n"
    adb -s "$emuId" push "$sample_file" "$destination" || exit 1
    adb -s "$emuId" shell am start -a android.intent.action.VIEW \
      -d "file://$destination" -t application/octet-stream -p io.bluewallet.bluewallet || exit 1
  else
    printf 'Opening the selected link…\n'
    adb -s "$emuId" shell am start -a android.intent.action.VIEW -d "$selectedLink" || exit 1
  fi
fi
printf '\n%sDone.%s\n' "$cyan" "$reset"
