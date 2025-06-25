#!/bin/bash

# BlueWallet Deep Link Test Tool
# Usage: ./deeplink-to-emusim.sh [category] [test_number]
# Examples:
#   ./deeplink-to-emusim.sh                    # Interactive mode
#   ./deeplink-to-emusim.sh bitcoin 1         # Bitcoin test #1
#   ./deeplink-to-emusim.sh lightning 2       # Lightning test #2
#   ./deeplink-to-emusim.sh settings 1        # App Settings test #1
#   ./deeplink-to-emusim.sh widgets 1         # App Extensions test #1
#   ./deeplink-to-emusim.sh qrcode 1          # QR Code image test #1
#   ./deeplink-to-emusim.sh notification      # Notification test (Push or Deep Link)
#
# Push Notification Testing:
#   This script uses `xcrun simctl push` to send properly formatted notifications
#   that work with the new LinkingConfig.ts navigation system

# Test data - using arrays for macOS compatibility
BITCOIN_TESTS=(
  "bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=0.001&label=Test%20Payment"
  "bluewallet:bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG"
  "bitcoin://bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.0001"
  "bluewallet:bitcoin://tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
)

# Helper function to clear screen
clear_screen() {
  clear
}

# Helper function to URL encode a string (bash-only, no jq dependency)
url_encode() {
  local string="${1}"
  local strlen=${#string}
  local encoded=""
  local pos c o

  for (( pos=0 ; pos<strlen ; pos++ )); do
     c=${string:$pos:1}
     case "$c" in
        [-_.~a-zA-Z0-9] ) o="${c}" ;;
        * )               printf -v o '%%%02x' "'$c"
     esac
     encoded+="${o}"
  done
  echo "${encoded}"
}

BITCOIN_DESCRIPTIONS=(
  "Bitcoin URI (bech32 + amount + label)"
  "BlueWallet Bitcoin URI (P2PKH)"
  "Bitcoin URI with double slash (bech32)"
  "BlueWallet Bitcoin URI with double slash (testnet)"
)

LIGHTNING_TESTS=(
  "lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq"
  "bluewallet:lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq"
  "lightning://lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3sdqsvfhkcap3xyhx7un8cqzpgxqzjcsp5f8c52y2stc300gl6s4xswtjpc37hrnnr3c9wvtgjfuvqmpm35evq9qyyssqy4lgd8tj637qcjp05rdpxxykjenthxftej7a2zzmwrmrl70fyj9hvj0rewhzj7jfyuwkwycgjg45z5wcs5jd6v4kgx2jq5y86tnlf0xc7p2tqqgcqcpd2q4h"
  "bluewallet:lightning://lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3sdqsvfhkcap3xyhx7un8cqzpgxqzjcsp5f8c52y2stc300gl6s4xswtjpc37hrnnr3c9wvtgjfuvqmpm35evq9qyyssqy4lgd8tj637qcjp05rdpxxykjenthxftej7a2zzmwrmrl70fyj9hvj0rewhzj7jfyuwkwycgjg45z5wcs5jd6v4kgx2jq5y86tnlf0xc7p2tqqgcqcpd2q4h"
)

LIGHTNING_DESCRIPTIONS=(
  "Lightning URI (standard)"
  "BlueWallet Lightning URI"
  "Lightning URI with double slash"
  "BlueWallet Lightning URI with double slash"
)

SETTINGS_TESTS=(
  "bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As"
  "bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com"
)

SETTINGS_DESCRIPTIONS=(
  "Electrum Server Settings"
  "Lightning Hub URL Settings"
)

WIDGETS_TESTS=(
  "bluewallet://widget?action=openSend"
  "bluewallet://widget?action=openReceive"
)

WIDGETS_DESCRIPTIONS=(
  "Widget: Open Send Screen"
  "Widget: Open Receive Screen"
)

# Web URLs that should open in browser or be handled as universal links
WEB_TESTS=(
  "https://azte.co/?c1=3062&c2=2586&c3=5053&c4=5261"
  "https://blockstream.info/tx/abc123"
)

WEB_DESCRIPTIONS=(
  "Azteco Voucher URL"
  "Block Explorer Link"
)

# Notification test addresses and URLs
NOTIFICATION_ADDRESSES=(
  "12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG"
  "bc1qmqrxpj6ace2lawuv99kd6q6u5d6kftucm2emdg"
  "BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE"
)

# Notification deep link URLs for testing LinkingConfig navigation
NOTIFICATION_DEEPLINKS=(
  "bluewallet://transaction/c4f32e7c3552a3b7f1b826e8e8c9b5c6bde9a8f4f6a2b1b8c6a7a6e4e3d2f1b0/status?address=bc1qmqrxpj6ace2lawuv99kd6q6u5d6kftucm2emdg"
  "bluewallet://wallet/wallet123?address=bc1qmqrxpj6ace2lawuv99kd6q6u5d6kftucm2emdg"
  "bluewallet://lnurl/pay?lnurl=lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctttdehhwm30d3h82unvwqhkxetrwfjhzum5wd6rjue9"
)

# Descriptions for notification deeplinks
NOTIFICATION_DEEPLINK_DESCRIPTIONS=(
  "Transaction Status Screen (matches LinkingConfig transaction status route)"
  "Wallet Transactions Screen (matches LinkingConfig wallet route)" 
  "LNURL Pay Screen (matches LinkingConfig LNURL pay route)"
)

# QR Code image tests - these contain actual QR code image data
QRCODE_TESTS=(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAABNYSURBVHja7Z1NbBvHFcd/u5ItWZJlx3bsOHYSJ02apE3TBG2BAmkBF+ihQIGih6JAgQJFe2gPPfTQQw89tIcCBXpo0UMPBQoUKFCgh6JA0UOBHgq0QIECBVqgQAu0QJO0SdokTpzYsWNLlizJH9wZcjkayeInd5ez7w8YWBJlzs7M/N/783ZmdklERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERER7S0SuwCR3UNKmQawD8A+AG0AurU/HQCa9b8mABYAVAEsAlgAUK79mwcwB2BWVdVF7AIiBwCRRkFK2Q6gH8ABAIcBDAI4BGC/9u8AgG4ATRHcdhnAHIApAO8DeAvAGwAmAUwAmFRVdd5EJxABAJGGhZSyBcBAzZf+MICjAI4BOKz9OwSg1UStLAF4G8BrAF4F8CqANwG8pqrqgo7PyVQgAgCiByiluGJfA3CRtJ9B4ym1fzUPYBzAKwBeAvASgJdVVV3W8bkoAggAiOgGKaU4j34MgPgBJHV8SdEEPX8p2Qs/xqxnAfwVwIsAXlBVdUaHPY8AIAJAs2/9PADxfD8J4HQBQxQ8v1VV9bROr0cAgABQPv9/DEDXvwqgS6fXJABAAMA5f1TA6wO4VKfXJgBAAJDdv6Hd/ycAPNbkb0EAkBgA5u7/H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"
)

QRCODE_DESCRIPTIONS=(
  "bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=0.001&label=QR Test"
)

# Global variables
selectedLink=""
selectedDescription=""
TEST_TYPE="DeepLink"

# Helper function to check if URL is a web URL
is_web_url() {
  local url="$1"
  [[ "$url" =~ ^https?:// ]]
}

# Helper function to check if URL is a data URI (QR code image)
is_data_uri() {
  local url="$1"
  [[ "$url" =~ ^data: ]]
}

# Function to get test data by category and number
get_test_data() {
  local category="$1"
  local num="$2"
  local index=$((num - 1))
  
  case "$category" in
    "bitcoin")
      if [ $index -ge 0 ] && [ $index -lt ${#BITCOIN_TESTS[@]} ]; then
        selectedLink="${BITCOIN_TESTS[$index]}"
        selectedDescription="${BITCOIN_DESCRIPTIONS[$index]}"
        return 0
      fi
      ;;
    "lightning")
      if [ $index -ge 0 ] && [ $index -lt ${#LIGHTNING_TESTS[@]} ]; then
        selectedLink="${LIGHTNING_TESTS[$index]}"
        selectedDescription="${LIGHTNING_DESCRIPTIONS[$index]}"
        return 0
      fi
      ;;
    "settings")
      if [ $index -ge 0 ] && [ $index -lt ${#SETTINGS_TESTS[@]} ]; then
        selectedLink="${SETTINGS_TESTS[$index]}"
        selectedDescription="${SETTINGS_DESCRIPTIONS[$index]}"
        return 0
      fi
      ;;
    "widgets")
      if [ $index -ge 0 ] && [ $index -lt ${#WIDGETS_TESTS[@]} ]; then
        selectedLink="${WIDGETS_TESTS[$index]}"
        selectedDescription="${WIDGETS_DESCRIPTIONS[$index]}"
        return 0
      fi
      ;;
    "qrcode")
      if [ $index -ge 0 ] && [ $index -lt ${#QRCODE_TESTS[@]} ]; then
        selectedLink="${QRCODE_TESTS[$index]}"
        selectedDescription="${QRCODE_DESCRIPTIONS[$index]}"
        return 0
      fi
      ;;
    "web")
      if [ $index -ge 0 ] && [ $index -lt ${#WEB_TESTS[@]} ]; then
        selectedLink="${WEB_TESTS[$index]}"
        selectedDescription="${WEB_DESCRIPTIONS[$index]}"
        return 0
      fi
      ;;
    "qrcode")
      if [ $index -ge 0 ] && [ $index -lt ${#QRCODE_TESTS[@]} ]; then
        selectedLink="${QRCODE_TESTS[$index]}"
        selectedDescription="${QRCODE_DESCRIPTIONS[$index]}"
        return 0
      fi
      ;;
  esac
  return 1
}

# Function to display test menu with arrow navigation
select_test_type() {
  local testOptions=("Deep Link Test" "Notification Test")
  local selected=0
  local ESC=$(printf "\033")
  
  while true; do
    clear
    echo
    echo
    echo -e "\033[1;36m╔════════════════════════════════════════════════════════════╗\033[0m"
    echo -e "\033[1;36m║                    BlueWallet Test Tool                    ║\033[0m"
    echo -e "\033[1;36m╚════════════════════════════════════════════════════════════╝\033[0m"
    echo
    echo
    echo
    echo -e "\033[1;37m                    Select test mode:\033[0m"
    echo
    echo
    
    for i in "${!testOptions[@]}"; do
      if [ $i -eq $selected ]; then
        echo -e "         \033[1;32m▶\033[0m  \033[1;37m${testOptions[$i]}\033[0m"
      else
        echo -e "            \033[37m${testOptions[$i]}\033[0m"
      fi
      echo
      echo
    done
    
    echo
    echo -e "\033[2;90m         ↑/↓ Navigate   Enter Select   ESC/q Quit\033[0m"
    
    read -rsn1 key
    if [[ $key == $ESC ]]; then
      read -rsn2 key
      case $key in
        '[A') # Up arrow
          ((selected--))
          if [ $selected -lt 0 ]; then
            selected=$((${#testOptions[@]} - 1))
          fi
          ;;
        '[B') # Down arrow
          ((selected++))
          if [ $selected -ge ${#testOptions[@]} ]; then
            selected=0
          fi
          ;;
        '[C'|'[D') # Right/Left arrows - ignore
          ;;
        *) # Any other sequence, treat as ESC key
          exit 0
          ;;
      esac
    elif [[ $key == $'\x1b' ]]; then # ESC key (alternative detection)
      exit 0
    elif [[ $key == "" ]]; then # Enter key
      TEST_TYPE="${testOptions[$selected]%% Test}"
      break
    elif [[ $key == "q" ]]; then
      exit 0
    fi
  done
  
  if [[ "$TEST_TYPE" == "Notification" ]]; then
    select_notification_type
  else
    select_deeplink_category
  fi
}

# Function to select notification test type
select_notification_type() {
  local notificationOptions=("Lightning Invoice Paid" "Address Got Paid" "Address Got Unconfirmed Transaction" "Transaction Confirmed")
  local notification_names=("Type 1: Lightning invoice was paid" "Type 2: New transaction to address" "Type 3: New unconfirmed transaction to address" "Type 4: Transaction confirmed")
  local selected=0
  local ESC=$(printf "\033")
  
  while true; do
    clear_screen
    echo -e "\033[1;36m📱 BlueWallet Deep Link Test Tool\033[0m"
    echo
    echo -e "\033[1;33m🔔 Select Notification Test Type:\033[0m"
    echo
    
    for i in "${!notificationOptions[@]}"; do
      if [ $i -eq $selected ]; then
        echo -e "     \033[1;32m▶\033[0m ${notificationOptions[$i]} - ${notification_names[$i]}"
      else
        echo -e "       ${notificationOptions[$i]} - ${notification_names[$i]}"
      fi
    done
    
    echo
    echo -e "\033[0;37m     Use ↑/↓ arrows to navigate, Enter to select, q to quit\033[0m"
    
    read -rsn1 key
    if [[ $key == $ESC ]]; then
      read -rsn2 key
      case $key in
        '[A') # Up arrow
          selected=$(( (selected - 1 + ${#notificationOptions[@]}) % ${#notificationOptions[@]} ))
          ;;
        '[B') # Down arrow
          selected=$(( (selected + 1) % ${#notificationOptions[@]} ))
          ;;
      esac
    elif [[ $key == "q" ]]; then
      exit 0
    elif [[ $key == "" ]]; then # Enter key
      NOTIFICATION_TYPE="${notificationOptions[$selected]}"
      break
    fi
  done
  
  if [[ "$NOTIFICATION_TYPE" == "Lightning Invoice Paid" ]]; then
    selectedDescription="Lightning Invoice Paid Test (Type 1)"
    NOTIFICATION_API_TYPE=1
    selectedLink="test_lightning_invoice"  # No address needed for lightning
  elif [[ "$NOTIFICATION_TYPE" == "Address Got Paid" ]]; then
    select_notification_address
    selectedDescription="Address Got Paid Test (Type 2)"
    NOTIFICATION_API_TYPE=2
  elif [[ "$NOTIFICATION_TYPE" == "Address Got Unconfirmed Transaction" ]]; then
    select_notification_address
    selectedDescription="Address Got Unconfirmed Transaction Test (Type 3)"
    NOTIFICATION_API_TYPE=3
  elif [[ "$NOTIFICATION_TYPE" == "Transaction Confirmed" ]]; then
    select_notification_address
    selectedDescription="Transaction Confirmed Test (Type 4)"
    NOTIFICATION_API_TYPE=4
  fi
}

# Function to select notification deep link
# Function to select a Bitcoin address for notification testing
select_notification_address() {
  local selected=0
  local ESC=$(printf "\033")
  
  while true; do
    clear_screen
    echo -e "\033[1;36m📱 BlueWallet Deep Link Test Tool\033[0m"
    echo
    echo -e "\033[1;33m💰 Select Bitcoin Address for Notification:\033[0m"
    echo
    
    # Add descriptions for each address
    local ADDRESS_DESCRIPTIONS=(
      "Legacy P2PKH address (starts with 1)"
      "Native SegWit bech32 address (starts with bc1, lowercase)"
      "Native SegWit bech32 address (starts with BC1, uppercase)"
    )
    
    for i in "${!NOTIFICATION_ADDRESSES[@]}"; do
      if [ $i -eq $selected ]; then
        echo -e "     \033[1;32m▶\033[0m ($((i+1))) ${ADDRESS_DESCRIPTIONS[$i]}"
        echo -e "         \033[1;33m${NOTIFICATION_ADDRESSES[$i]}\033[0m"
      else
        echo -e "       ($((i+1))) ${ADDRESS_DESCRIPTIONS[$i]}"
        echo -e "         \033[0;90m${NOTIFICATION_ADDRESSES[$i]}\033[0m"
      fi
      echo
    done
    
    echo
    echo -e "\033[0;37m     Use ↑/↓ arrows to navigate, Enter to select, q to quit\033[0m"
    
    read -rsn1 key
    if [[ $key == $ESC ]]; then
      read -rsn2 key
      case $key in
        '[A') # Up arrow
          selected=$(( (selected - 1 + ${#NOTIFICATION_ADDRESSES[@]}) % ${#NOTIFICATION_ADDRESSES[@]} ))
          ;;
        '[B') # Down arrow
          selected=$(( (selected + 1) % ${#NOTIFICATION_ADDRESSES[@]} ))
          ;;
      esac
    elif [[ $key == "q" ]]; then
      exit 0
    elif [[ $key == "" ]]; then # Enter key
      selectedLink="${NOTIFICATION_ADDRESSES[$selected]}"
      break
    fi
  done
}

select_notification_deeplink() {
  local selected=0
  local ESC=$(printf "\033")
  
  while true; do
    clear_screen
    echo -e "\033[1;36m📱 BlueWallet Deep Link Test Tool\033[0m"
    echo
    echo -e "\033[1;33m🔗 Select Notification Deep Link:\033[0m"
    echo
    
    for i in "${!NOTIFICATION_DEEPLINKS[@]}"; do
      if [ $i -eq $selected ]; then
        echo -e "     \033[1;32m▶\033[0m ($((i+1))) ${NOTIFICATION_DEEPLINK_DESCRIPTIONS[$i]}"
        echo -e "         \033[0;90m${NOTIFICATION_DEEPLINKS[$i]:0:80}...\033[0m"
      else
        echo -e "       ($((i+1))) ${NOTIFICATION_DEEPLINK_DESCRIPTIONS[$i]}"
      fi
    done
    
    echo
    echo -e "\033[0;37m     Use ↑/↓ arrows to navigate, Enter to select, q to quit\033[0m"
    
    read -rsn1 key
    if [[ $key == $ESC ]]; then
      read -rsn2 key
      case $key in
        '[A') # Up arrow
          selected=$(( (selected - 1 + ${#NOTIFICATION_DEEPLINKS[@]}) % ${#NOTIFICATION_DEEPLINKS[@]} ))
          ;;
        '[B') # Down arrow
          selected=$(( (selected + 1) % ${#NOTIFICATION_DEEPLINKS[@]} ))
          ;;
      esac
    elif [[ $key == "q" ]]; then
      exit 0
    elif [[ $key == "" ]]; then # Enter key
      selectedLink="${NOTIFICATION_DEEPLINKS[$selected]}"
      selectedDescription="${NOTIFICATION_DEEPLINK_DESCRIPTIONS[$selected]}"
      break
    fi
  done
}

# Function to select deeplink category
select_deeplink_category() {
  local categories=("bitcoin" "lightning" "settings" "widgets" "web" "qrcode")
  local category_names=("Bitcoin URIs" "Lightning URIs" "App Settings" "App Extensions (widgets)" "Web/Universal Links" "QR Code Images")
  local selected=0
  local ESC=$(printf "\033")
  
  while true; do
    clear
    echo
    echo
    echo -e "\033[1;36m╔════════════════════════════════════════════════════════════╗\033[0m"
    echo -e "\033[1;36m║                    BlueWallet Test Tool                    ║\033[0m"
    echo -e "\033[1;36m╚════════════════════════════════════════════════════════════╝\033[0m"
    echo
    echo
    echo
    echo -e "\033[1;37m                  Select test category:\033[0m"
    echo
    echo
    
    for i in "${!categories[@]}"; do
      local count=0
      case "${categories[$i]}" in
        "bitcoin") count=${#BITCOIN_TESTS[@]} ;;
        "lightning") count=${#LIGHTNING_TESTS[@]} ;;
        "settings") count=${#SETTINGS_TESTS[@]} ;;
        "widgets") count=${#WIDGETS_TESTS[@]} ;;
        "web") count=${#WEB_TESTS[@]} ;;
        "qrcode") count=${#QRCODE_TESTS[@]} ;;
      esac
      
      if [ $i -eq $selected ]; then
        echo -e "         \033[1;32m▶\033[0m  \033[1;37m${category_names[$i]}\033[0m \033[2;90m($count tests)\033[0m"
      else
        echo -e "            \033[37m${category_names[$i]}\033[0m \033[2;90m($count tests)\033[0m"
      fi
      echo
      echo
    done
    
    echo
    echo -e "\033[2;90m         ↑/↓ Navigate   Enter Select   ESC/b Back\033[0m"
    
    read -rsn1 key
    if [[ $key == $ESC ]]; then
      read -rsn2 key
      case $key in
        '[A') # Up arrow
          ((selected--))
          if [ $selected -lt 0 ]; then
            selected=$((${#categories[@]} - 1))
          fi
          ;;
        '[B') # Down arrow
          ((selected++))
          if [ $selected -ge ${#categories[@]} ]; then
            selected=0
          fi
          ;;
        '[C'|'[D') # Right/Left arrows - ignore
          ;;
        *) # Any other sequence, treat as ESC key
          select_test_type
          return
          ;;
      esac
    elif [[ $key == $'\x1b' ]]; then # ESC key (alternative detection)
      select_test_type
      return
    elif [[ $key == "" ]]; then # Enter key
      select_specific_test "${categories[$selected]}"
      break
    elif [[ $key == "b" ]]; then
      select_test_type
      return
    fi
  done
}

# Function to select specific test within a category
select_specific_test() {
  local category="$1"
  local tests=()
  local descriptions=()
  local selected=0
  local ESC=$(printf "\033")
  
  # Populate tests and descriptions based on category
  case "$category" in
    "bitcoin")
      tests=("${BITCOIN_TESTS[@]}")
      descriptions=("${BITCOIN_DESCRIPTIONS[@]}")
      ;;
    "lightning")
      tests=("${LIGHTNING_TESTS[@]}")
      descriptions=("${LIGHTNING_DESCRIPTIONS[@]}")
      ;;
    "settings")
      tests=("${SETTINGS_TESTS[@]}")
      descriptions=("${SETTINGS_DESCRIPTIONS[@]}")
      ;;
    "widgets")
      tests=("${WIDGETS_TESTS[@]}")
      descriptions=("${WIDGETS_DESCRIPTIONS[@]}")
      ;;
    "web")
      tests=("${WEB_TESTS[@]}")
      descriptions=("${WEB_DESCRIPTIONS[@]}")
      ;;
    "qrcode")
      tests=("${QRCODE_TESTS[@]}")
      descriptions=("${QRCODE_DESCRIPTIONS[@]}")
      ;;
  esac
  
  while true; do
    clear
    echo
    echo
    echo -e "\033[1;36m╔════════════════════════════════════════════════════════════╗\033[0m"
    echo -e "\033[1;36m║                    BlueWallet Test Tool                    ║\033[0m"
    echo -e "\033[1;36m╚════════════════════════════════════════════════════════════╝\033[0m"
    echo
    echo
    echo
    echo -e "\033[1;37m              Select \033[1;33m${category}\033[1;37m test:\033[0m"
    echo
    echo
    
    for i in "${!descriptions[@]}"; do
      if [ $i -eq $selected ]; then
        echo -e "         \033[1;32m▶\033[0m  \033[1;37m${descriptions[$i]}\033[0m"
        # Only show the raw test data for non-QR code tests (data URIs are too long)
        if [[ "$category" != "qrcode" ]]; then
          echo -e "            \033[2;90m${tests[$i]}\033[0m"
        fi
        echo
        echo
      else
        echo -e "            \033[37m${descriptions[$i]}\033[0m"
        echo
      fi
    done
    
    echo
    echo -e "\033[2;90m         ↑/↓ Navigate   Enter Select   ESC/b Back\033[0m"
    
    read -rsn1 key
    if [[ $key == $ESC ]]; then
      read -rsn2 key
      case $key in
        '[A') # Up arrow
          ((selected--))
          if [ $selected -lt 0 ]; then
            selected=$((${#tests[@]} - 1))
          fi
          ;;
        '[B') # Down arrow
          ((selected++))
          if [ $selected -ge ${#tests[@]} ]; then
            selected=0
          fi
          ;;
        '[C'|'[D') # Right/Left arrows - ignore
          ;;
        *) # Any other sequence, treat as ESC key
          select_deeplink_category
          return
          ;;
      esac
    elif [[ $key == $'\x1b' ]]; then # ESC key (alternative detection)
      select_deeplink_category
      return
    elif [[ $key == "" ]]; then # Enter key
      selectedLink="${tests[$selected]}"
      selectedDescription="${descriptions[$selected]}"
      break
    elif [[ $key == "b" ]]; then
      select_deeplink_category
      return
    fi
  done
}

# Select device and send deeplink
select_device_and_send() {
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
    echo -e "\n\033[1;31mNo running iOS simulators or Android emulators found.\033[0m"
    offer_to_launch_device
    return
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

  local selected=0
  
  # If only one device, auto-select it
  if [ ${#devices[@]} -eq 1 ]; then
    echo
    echo
    echo -e "\033[1;37m                 Device Selection:\033[0m"
    echo
    echo
    echo -e "     \033[1;32m✓\033[0m Auto-selecting single device: \033[1;37m${devices[0]}\033[0m"
    echo
    echo
    selected=0
  else
    # Multiple devices - show selection menu
    echo
    echo
    echo -e "\033[1;37m                Select target device:\033[0m"
    echo
    echo
    
    local ESC=$(printf "\033")
    
    while true; do
      # Display devices
      for i in "${!devices[@]}"; do
        if [ $i -eq $selected ]; then
          echo -e "         \033[1;32m▶\033[0m  \033[1;37m${devices[$i]}\033[0m"
        else
          echo -e "            \033[37m${devices[$i]}\033[0m"
        fi
        echo
      done
      
      echo
      echo -e "\033[2;90m         ↑/↓ Navigate   Enter Select\033[0m"
      
      read -rsn1 key
      if [[ $key == $ESC ]]; then
        read -rsn2 key
        case $key in
          '[A') # Up arrow
            ((selected--))
            if [ $selected -lt 0 ]; then
              selected=$((${#devices[@]} - 1))
            fi
            # Clear previous output
            for ((j=0; j<${#devices[@]}+4; j++)); do
              echo -e "\033[1A\033[K"
            done
            ;;
          '[B') # Down arrow
            ((selected++))
            if [ $selected -ge ${#devices[@]} ]; then
              selected=0
            fi
            # Clear previous output
            for ((j=0; j<${#devices[@]}+4; j++)); do
              echo -e "\033[1A\033[K"
            done
            ;;
          '[C'|'[D') # Right/Left arrows - ignore
            ;;
        esac
      elif [[ $key == "" ]]; then # Enter key
        break
      fi
    done
  fi
  
  device="${devices[$selected]}"
  platform="${device%%:*}"
  dev="${device#*: }"
  
  if [[ "$platform" == "iOS Simulator" ]]; then
    # Find the UDID for the selected device
    for sim in "${ios_sims[@]}"; do
      IFS='|' read -r name os udid <<< "$sim"
      if [[ "$dev" == "$name ($os)" ]]; then
        send_to_ios_simulator "$udid" "$name"
        break
      fi
    done
  else
    emuId="${dev%% *}"
    send_to_android_emulator "$emuId"
  fi
}

# Function to send to iOS simulator
send_to_ios_simulator() {
  local udid="$1"
  local name="$2"
  
  echo
  echo
  echo -e "\033[1;33m📱 Sending to iOS Simulator: \033[1;37m$name\033[0m"
  echo
  echo
  
  if [[ "$TEST_TYPE" == "Notification" ]]; then
    if [[ "$NOTIFICATION_TYPE" == "Lightning Invoice Paid" ]]; then
      echo -e "     \033[1;37mTest:\033[0m     Lightning Invoice Paid (Type 1)"
      echo -e "     \033[1;37mInvoice:\033[0m  Test Lightning Invoice"
      echo
      echo
      
      # Generate test data for lightning invoice
      hash="test_hash_$(date +%s)"
      current_timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      
      # Construct lightning invoice deep link
      deep_link="bluewallet://lightningInvoice?hash=${hash}&sat=1000"
      
      # Build APNS payload for Lightning Invoice Paid (Type 1)
      read -r -d '' APNS_PAYLOAD << JSON
{
  "Simulator Target Bundle": "io.bluewallet.bluewallet",
  "aps": {
    "alert": {
      "title": "Lightning Invoice Paid",
      "body": "Your lightning invoice for 1000 satoshis was paid.",
      "action": "View Invoice"
    },
    "sound": "default",
    "badge": 1,
    "content-available": 1,
    "mutable-content": 1,
    "category": "LIGHTNING"
  },
  "data": {
    "type": 1,
    "level": "transactions",
    "sat": 1000,
    "hash": "$hash",
    "memo": "Test Lightning Payment",
    "userInteraction": true,
    "foreground": true,
    "timestamp": "$current_timestamp"
  },
  "message": "Lightning invoice paid",
  "subText": "1000 satoshis received"
}
JSON
      # write payload to temporary file
      apns_file=$(mktemp /tmp/bluewallet-apns-XXXXXX.apns)
      printf '%s' "$APNS_PAYLOAD" > "$apns_file"
      
      echo -e "     🔔 \033[1;32mPushing notification to simulator using xcrun simctl push...\033[0m"
      echo -e "     💰 \033[1;32mAddress: $selectedLink\033[0m"
      echo -e "     🆔 \033[1;32mTransaction ID: $txid\033[0m"
      
      if xcrun simctl push "$udid" "io.bluewallet.bluewallet" "$apns_file" 2>/dev/null; then
        echo -e "     ✅ \033[1;32mNotification sent successfully!\033[0m"
      else
        echo -e "     ❌ \033[1;31mFailed to send notification. Make sure BlueWallet is installed.\033[0m"
        echo -e "     ℹ️ \033[1;34mCommand used: xcrun simctl push \"$udid\" \"io.bluewallet.bluewallet\" \"$apns_file\"\033[0m"
      fi
      rm -f "$apns_file"
    elif [[ "$NOTIFICATION_TYPE" == "Address Got Paid" ]]; then
      echo -e "     \033[1;37mTest:\033[0m     Address Got Paid (Type 2)"
      echo -e "     \033[1;37mAddress:\033[0m  $selectedLink"
      echo
      echo
      
      # Generate unique txid for testing
      txid="sample_txid_$(date +%s)"
      current_timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      
      # URL encode the address for the deep link
      encoded_address=$(url_encode "$selectedLink")
      
      # Construct deep link URL for confirmed transaction
      deep_link="bluewallet://receive?address=${encoded_address}&txid=${txid}"
      
      # Build APNS payload for Address Got Paid (Type 2)
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
    "content-available": 1,
    "mutable-content": 1,
    "category": "TRANSACTION"
  },
  "data": {
    "type": 2,
    "level": "transactions",
    "sat": 2000,
    "address": "$selectedLink",
    "txid": "$txid",
    "userInteraction": true,
    "foreground": true,
    "timestamp": "$current_timestamp"
  },
  "message": "Transaction received",
  "subText": "2000 satoshis received"
}
JSON
      # write payload to temporary file
      apns_file=$(mktemp /tmp/bluewallet-apns-XXXXXX.apns)
      printf '%s' "$APNS_PAYLOAD" > "$apns_file"
      
      echo -e "     🔔 \033[1;32mPushing address-only notification to simulator...\033[0m"
      echo -e "     💰 \033[1;32mAddress: $selectedLink\033[0m"
      echo -e "     ℹ️ \033[1;33mNo transaction ID - tests ReceiveDetails routing\033[0m"
      echo -e "     📱 \033[1;36mTap the notification when it appears to trigger routing\033[0m"
      
      if xcrun simctl push "$udid" "io.bluewallet.bluewallet" "$apns_file" 2>/dev/null; then
        echo -e "     ✅ \033[1;32mAddress-only notification sent successfully!\033[0m"
        echo -e "     👆 \033[1;33mNow tap the notification in the simulator to test routing\033[0m"
        echo -e "     📱 \033[1;36mThis should route to ReceiveDetails screen when tapped\033[0m"
      else
        echo -e "     ❌ \033[1;31mFailed to send notification. Make sure BlueWallet is installed.\033[0m"
        echo -e "     ℹ️ \033[1;34mCommand used: xcrun simctl push \"$udid\" \"io.bluewallet.bluewallet\" \"$apns_file\"\033[0m"
      fi
      rm -f "$apns_file"
    elif [[ "$NOTIFICATION_TYPE" == "Address Got Unconfirmed Transaction" ]]; then
      echo -e "     \033[1;37mTest:\033[0m     Address Got Unconfirmed Transaction (Type 3)"
      echo -e "     \033[1;37mAddress:\033[0m  $selectedLink"
      echo
      echo
      
      # Generate unique txid for testing
      txid="unconfirmed_txid_$(date +%s)"
      current_timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      
      # URL encode the address for the deep link
      encoded_address=$(url_encode "$selectedLink")
      
      # Construct deep link URL for unconfirmed transaction
      deep_link="bluewallet://receive?address=${encoded_address}&txid=${txid}"
      
      # Build APNS payload for Address Got Unconfirmed Transaction (Type 3)
      read -r -d '' APNS_PAYLOAD << JSON
{
  "Simulator Target Bundle": "io.bluewallet.bluewallet",
  "aps": {
    "alert": {
      "title": "Unconfirmed Transaction",
      "body": "You received an unconfirmed transaction of 1500 satoshis.",
      "action": "View Transaction"
    },
    "sound": "default",
    "badge": 1,
    "content-available": 1,
    "mutable-content": 1,
    "category": "UNCONFIRMED"
  },
  "data": {
    "type": 3,
    "level": "transactions",
    "sat": 1500,
    "address": "$selectedLink",
    "txid": "$txid",
    "userInteraction": true,
    "foreground": true,
    "timestamp": "$current_timestamp"
  },
  "message": "Unconfirmed transaction received",
  "subText": "1500 satoshis pending"
}
JSON
      # write payload to temporary file
      apns_file=$(mktemp /tmp/bluewallet-apns-XXXXXX.apns)
      printf '%s' "$APNS_PAYLOAD" > "$apns_file"
      
      echo -e "     � \033[1;32mPushing unconfirmed transaction notification to simulator...\033[0m"
      echo -e "     💰 \033[1;32mAddress: $selectedLink\033[0m"
      echo -e "     🆔 \033[1;32mTransaction ID: $txid (unconfirmed)\033[0m"
      
      if xcrun simctl push "$udid" "io.bluewallet.bluewallet" "$apns_file" 2>/dev/null; then
        echo -e "     ✅ \033[1;32mUnconfirmed transaction notification sent successfully!\033[0m"
      else
        echo -e "     ❌ \033[1;31mFailed to send notification. Make sure BlueWallet is installed.\033[0m"
        echo -e "     ℹ️ \033[1;34mCommand used: xcrun simctl push \"$udid\" \"io.bluewallet.bluewallet\" \"$apns_file\"\033[0m"
      fi
      rm -f "$apns_file"
    elif [[ "$NOTIFICATION_TYPE" == "Transaction Confirmed" ]]; then
      echo -e "     \033[1;37mTest:\033[0m     Transaction Confirmed (Type 4)"
      echo -e "     \033[1;37mAddress:\033[0m  $selectedLink"
      echo
      echo
      
      # Generate unique txid for testing
      txid="confirmed_txid_$(date +%s)"
      current_timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      
      # Construct deep link URL for confirmed transaction
      deep_link="bluewallet://transaction/${txid}"
      
      # Build APNS payload for Transaction Confirmed (Type 4)
      read -r -d '' APNS_PAYLOAD << JSON
{
  "Simulator Target Bundle": "io.bluewallet.bluewallet",
  "aps": {
    "alert": {
      "title": "Transaction Confirmed",
      "body": "Your transaction has been confirmed on the blockchain.",
      "action": "View Transaction"
    },
    "sound": "default",
    "badge": 1,
    "content-available": 1,
    "mutable-content": 1,
    "category": "CONFIRMED"
  },
  "data": {
    "type": 4,
    "level": "transactions",
    "txid": "$txid",
    "userInteraction": true,
    "foreground": true,
    "timestamp": "$current_timestamp"
  },
  "message": "Transaction confirmed",
  "subText": "Blockchain confirmation received"
}
JSON
      # write payload to temporary file
      apns_file=$(mktemp /tmp/bluewallet-apns-XXXXXX.apns)
      printf '%s' "$APNS_PAYLOAD" > "$apns_file"
      
      echo -e "     � \033[1;32mPushing transaction confirmed notification to simulator...\033[0m"
      echo -e "     🆔 \033[1;32mTransaction ID: $txid (confirmed)\033[0m"
      
      if xcrun simctl push "$udid" "io.bluewallet.bluewallet" "$apns_file" 2>/dev/null; then
        echo -e "     ✅ \033[1;32mTransaction confirmed notification sent successfully!\033[0m"
      else
        echo -e "     ❌ \033[1;31mFailed to send notification. Make sure BlueWallet is installed.\033[0m"
        echo -e "     ℹ️ \033[1;34mCommand used: xcrun simctl push \"$udid\" \"io.bluewallet.bluewallet\" \"$apns_file\"\033[0m"
      fi
      rm -f "$apns_file"
    fi
  else
    echo -e "     \033[1;37mTest:\033[0m     $selectedDescription"
    echo -e "     \033[1;37mURI:\033[0m      $selectedLink"
    echo
    echo
    
    if is_web_url "$selectedLink"; then
      echo -e "     🌐 \033[1;32mOpening web URL in Safari...\033[0m"
      if xcrun simctl openurl "$udid" "$selectedLink" 2>/dev/null; then
        echo -e "     ✅ \033[1;32mWeb URL opened successfully in Safari!\033[0m"
      else
        echo -e "     ❌ \033[1;31mFailed to open web URL. Make sure the simulator is running.\033[0m"
      fi
    elif is_data_uri "$selectedLink"; then
      handle_qr_data_uri "$udid" "$selectedLink"
    else
      echo -e "     🔗 \033[1;32mSending deep link to simulator...\033[0m"
      if xcrun simctl openurl "$udid" "$selectedLink" 2>/dev/null; then
        echo -e "     ✅ \033[1;32mDeep link sent successfully!\033[0m"
      else
        echo -e "     ❌ \033[1;31mFailed to send deep link. Make sure the simulator is running.\033[0m"
      fi
    fi
  fi
}

# Function to send to Android emulator
send_to_android_emulator() {
  local emuId="$1"
  
  echo
  echo
  echo -e "\033[1;33m🤖 Sending to Android Emulator: \033[1;37m$emuId\033[0m"
  echo
  echo
  
  if [[ "$TEST_TYPE" == "Notification" ]]; then
    if [[ "$NOTIFICATION_TYPE" == "Push Notification" ]]; then
      echo -e "     \033[1;37mTest:\033[0m     Push Notification"  
      echo -e "     \033[1;37mAddress:\033[0m  $selectedLink"
      echo
      echo
      echo -e "     ⚠️  \033[1;33mPush notification testing not supported on Android emulators.\033[0m"
      echo -e "         Use iOS Simulator for push notification tests."
      echo
      echo
      return
    else
      echo -e "     \033[1;37mTest:\033[0m     Notification Deep Link"
      echo -e "     \033[1;37mURL:\033[0m      $selectedLink"
      echo
      echo
      
      echo -e "     🔗 \033[1;32mSending notification deep link to emulator...\033[0m"
      if adb -s "$emuId" shell am start -W -a android.intent.action.VIEW -d "$selectedLink" io.bluewallet.bluewallet 2>/dev/null; then
        echo -e "     ✅ \033[1;32mNotification deep link sent successfully!\033[0m"
      else
        echo -e "     ❌ \033[1;31mFailed to send notification deep link. Make sure BlueWallet is installed.\033[0m"
      fi
      return
    fi
  fi
  
  echo -e "     \033[1;37mTest:\033[0m     $selectedDescription"
  echo -e "     \033[1;37mURI:\033[0m      $selectedLink"
  echo
  echo
  
  if is_web_url "$selectedLink"; then
    echo -e "     🌐 \033[1;32mOpening web URL in browser...\033[0m"
    if adb -s "$emuId" shell am start -a android.intent.action.VIEW -d "$selectedLink" 2>/dev/null; then
      echo -e "     ✅ \033[1;32mWeb URL opened successfully in browser!\033[0m"
    else
      echo -e "     ❌ \033[1;31mFailed to open web URL. Make sure the emulator is running.\033[0m"
    fi
  else
    echo -e "     🔗 \033[1;32mSending deep link to emulator...\033[0m"
    if adb -s "$emuId" shell am start -a android.intent.action.VIEW -d "$selectedLink" 2>/dev/null; then
      echo -e "     ✅ \033[1;32mDeep link sent successfully!\033[0m"
    else
      echo -e "     ❌ \033[1;31mFailed to send deep link. Make sure the emulator is running and BlueWallet is installed.\033[0m"
    fi
  fi
}

# Function to offer launching a device when none are available
offer_to_launch_device() {
  echo
  echo
  echo -e "Would you like to launch a device?"
  echo
  echo
  
  # Get available iOS simulators (exclude unavailable and watch devices)
  available_ios_sims=()
  while IFS= read -r line; do
    if [[ $line =~ --\ (.*)\ -- ]]; then
      osVersion="${BASH_REMATCH[1]}"
    elif [[ $line =~ \(Shutdown\) ]] && [[ ! $line =~ "Unavailable" ]]; then
      # Skip Watch and Vision Pro devices
      if [[ $line =~ "Watch" ]] || [[ $line =~ "Vision" ]]; then
        continue
      fi
      
      # trim leading whitespace
      raw=$(echo "$line" | sed 's/^[[:space:]]*//')
      # extract UDID (UUID format)
      udid=$(echo "$raw" | grep -oE '[A-F0-9-]{36}' | head -n1)
      if [[ -n "$udid" ]]; then
        name=$(echo "$raw" | sed -E "s/ \($udid\).*//")
        # Only include iPhone and iPad devices
        if [[ $name =~ iPhone|iPad ]]; then
          available_ios_sims+=("$name|$osVersion|$udid")
        fi
      fi
    fi
  done < <(xcrun simctl list devices)

  # Get available Android AVDs
  available_android_avds=()
  while IFS= read -r line; do
    if [[ $line =~ ^[[:space:]]*([^[:space:]]+) ]]; then
      avd_name="${BASH_REMATCH[1]}"
      available_android_avds+=("$avd_name")
    fi
  done < <(emulator -list-avds 2>/dev/null)

  local options=()
  local device_types=()
  
  # Add iOS simulators to options
  for sim in "${available_ios_sims[@]}"; do
    IFS='|' read -r name os udid <<< "$sim"
    options+=("iOS Simulator: $name ($os)")
    device_types+=("ios|$udid")
  done
  
  # Add Android AVDs to options
  for avd in "${available_android_avds[@]}"; do
    options+=("Android Emulator: $avd")
    device_types+=("android|$avd")
  done
  
  if [ ${#options[@]} -eq 0 ]; then
    echo -e "\033[1;31mNo devices available to launch.\033[0m"
    echo -e "Please create an iOS Simulator or Android AVD first."
    echo
    echo
    exit 1
  fi
  
  options+=("Cancel")
  device_types+=("cancel|")
  
  local selected=0
  local ESC=$(printf "\033")
  
  while true; do
    clear
    echo
    echo
    echo -e "\033[1;34m═══════════════════════════════════════════════════════════════\033[0m"
    echo -e "\033[1;34m                        Launch Device                           \033[0m"
    echo -e "\033[1;34m═══════════════════════════════════════════════════════════════\033[0m"
    echo
    echo
    echo -e "\033[1;31m             No running devices found.\033[0m"
    echo
    echo -e "\033[1m              Select a device to launch:\033[0m"
    echo
    echo
    
    for i in "${!options[@]}"; do
      if [ $i -eq $selected ]; then
        echo -e "         \033[1;32m▶\033[0m  \033[1;37m${options[$i]}\033[0m"
      else
        echo -e "            \033[37m${options[$i]}\033[0m"
      fi
      echo
    done
    
    echo
    echo -e "\033[2;90m        ↑/↓ Navigate   Enter Select   q Quit\033[0m"
    
    read -rsn1 key
    if [[ $key == $ESC ]]; then
      read -rsn2 key
      case $key in
        '[A') # Up arrow
          ((selected--))
          if [ $selected -lt 0 ]; then
            selected=$((${#options[@]} - 1))
          fi
          ;;
        '[B') # Down arrow
          ((selected++))
          if [ $selected -ge ${#options[@]} ]; then
            selected=0
          fi
          ;;
        '[C'|'[D') # Right/Left arrows - ignore
          ;;
      esac
    elif [[ $key == "" ]]; then # Enter key
      break
    fi
  done
  
  IFS='|' read -r platform device_id <<< "${device_types[$selected]}"
  
  case "$platform" in
    "ios")
      echo
      echo
      echo -e "\033[1;33m🚀 Launching iOS Simulator...\033[0m"
      if xcrun simctl boot "$device_id" 2>/dev/null; then
        echo -e "\033[1;32m✅ iOS Simulator launched successfully!\033[0m"
        echo -e "\033[90mWaiting for simulator to be ready...\033[0m"
        sleep 3
        # Retry the original function
        select_device_and_send
      else
        echo -e "\033[1;31m❌ Failed to launch iOS Simulator.\033[0m"
        exit 1
      fi
      ;;
    "android")
      echo
      echo
      echo -e "\033[1;33m🚀 Launching Android Emulator: $device_id\033[0m"
      echo -e "\033[90mThis may take a few moments...\033[0m"
      emulator -avd "$device_id" -no-snapshot-save >/dev/null 2>&1 &
      local emulator_pid=$!
      echo -e "\033[1;32m✅ Android Emulator launched successfully!\033[0m"
      echo -e "\033[90mWaiting for emulator to be ready...\033[0m"
      sleep 10
      # Wait for the emulator to be ready
      local wait_count=0
      while [ $wait_count -lt 30 ]; do
        if adb devices | grep -q "device$"; then
          break
        fi
        sleep 2
        ((wait_count++))
      done
      # Retry the original function
      select_device_and_send
      ;;
    "cancel")
      echo
      echo
      echo -e "\033[1;33mCancelled.\033[0m"
      exit 0
      ;;
  esac
}

# Function to create temporary file from data URI and open it
handle_qr_data_uri() {
  local udid="$1"
  local data_uri="$2"
  
  # Extract the base64 data (remove data:image/png;base64, prefix)
  local base64_data="${data_uri#data:image/png;base64,}"
  
  # Create temporary file
  local temp_file="/tmp/qr_test_$(date +%s).png"
  
  # Decode base64 to file
  echo "$base64_data" | base64 -d > "$temp_file"
  
  if [ -f "$temp_file" ]; then
    echo -e "     📱 \033[1;32mOpening QR code image in simulator...\033[0m"
    # Use open command to open the image file, which should trigger the deep link handler
    if open -a "Simulator" "$temp_file" 2>/dev/null; then
      echo -e "     ✅ \033[1;32mQR code image opened successfully!\033[0m"
    else
      echo -e "     ❌ \033[1;31mFailed to open QR code image.\033[0m"
    fi
    
    # Clean up temporary file after a delay
    (sleep 5 && rm -f "$temp_file") &
  else
    echo -e "     ❌ \033[1;31mFailed to create temporary QR code file.\033[0m"
  fi
}

# Parse command line arguments
if [ $# -eq 2 ]; then
  CATEGORY="$1"
  TEST_NUM="$2"
  
  if get_test_data "$CATEGORY" "$TEST_NUM"; then
    echo
    echo -e "\033[1m[Auto Mode] Testing: $selectedDescription\033[0m"
    echo "URI: $selectedLink"
  else
    echo
    echo -e "\033[1;31mError: Invalid test specified. Use format: $0 <category> <number>\033[0m"
    echo "Available categories: bitcoin (1-${#BITCOIN_TESTS[@]}), lightning (1-${#LIGHTNING_TESTS[@]}), legacy (1-${#LEGACY_TESTS[@]}), web (1-${#WEB_TESTS[@]})"
    exit 1
  fi
elif [ $# -eq 1 ] && [ "$1" = "notification" ]; then
  # Notification mode
  TEST_TYPE="Notification"
  selectedLink="${NOTIFICATION_ADDRESSES[0]}"
  echo
  echo -e "\033[1m[Auto Mode] Testing: Notification\033[0m"
  echo "Address: $selectedLink"
elif [ $# -eq 0 ]; then
  # Interactive mode
  select_test_type
else
  echo
  echo -e "\033[1;31mUsage:\033[0m"
  echo "  $0                          # Interactive mode"
  echo "  $0 <category> <number>      # Auto mode"
  echo "  $0 notification             # Notification test"
  echo ""
  echo "\033[1mCategories:\033[0m"
  echo "  bitcoin    - Bitcoin URI tests (1-${#BITCOIN_TESTS[@]})"
  echo "  lightning  - Lightning URI tests (1-${#LIGHTNING_TESTS[@]})"
  echo "  settings   - App Settings tests (1-${#SETTINGS_TESTS[@]})"
  echo "  widgets    - App Extensions tests (1-${#WIDGETS_TESTS[@]})"
  echo "  web        - Web/Universal Link tests (1-${#WEB_TESTS[@]})"
  echo "  qrcode     - QR Code image tests (1-${#QRCODE_TESTS[@]})"
  exit 1
fi

# Main execution
if [[ -z "$selectedLink" ]]; then
  echo
  echo -e "\033[1;31m✗ Error: No test link selected.\033[0m"
  echo
  exit 1
fi

echo
echo
echo
echo -e "\033[1;36m╔════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║                      Test Summary                          ║\033[0m"
echo -e "\033[1;36m╚════════════════════════════════════════════════════════════╝\033[0m"
echo
echo

if [[ "$TEST_TYPE" == "Notification" ]]; then
  echo -e "     \033[1;37mMode:\033[0m   🔔 Notification Test"
  echo -e "     \033[1;37mTarget:\033[0m $selectedLink"
else
  echo -e "     \033[1;37mMode:\033[0m   🔗 Deep Link Test"  
  echo -e "     \033[1;37mTest:\033[0m   $selectedDescription"
  echo -e "     \033[1;37mURI:\033[0m    $selectedLink"
fi

echo
echo
echo -e "\033[1;36m╚════════════════════════════════════════════════════════════╝\033[0m"
echo

select_device_and_send

echo
echo
echo
echo -e "\033[1;32m╔════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;32m║                    Test Completed                         ║\033[0m"
echo -e "\033[1;32m╚════════════════════════════════════════════════════════════╝\033[0m"
echo
echo