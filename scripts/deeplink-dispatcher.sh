#!/bin/bash

# ===============================
# deeplink_dispatcher.sh
# ===============================
# Description:
#   Displays an interactive menu to select a deep link (predefined or custom) and sends it to chosen iOS and/or Android emulators.
#
# Prerequisites:
#   - Xcode installed for iOS Simulator (xcrun)
#   - Android Studio installed with adb accessible
#
# Usage:
#   ./deeplink_dispatcher.sh
# ===============================

# ===============================
# Configuration
# ===============================

# List of predefined deep links
PREDEFINED_LINKS=(
  "bitcoin://1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"
  "bitcoin://bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7?amount=0.0001&pj=https://btc.donate.kukks.org/BTC/pj"
  "BITCOIN://1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar"
  "lightning://lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4"
  "https://azte.co/?c1=3062&c2=2586&c3=5053&c4=5261"
  "https://lnbits.com/?lightning=LNURL1DP68GURN8GHJ7MRWVF5HGUEWVDHK6TMHD96XSERJV9MJ7CTSDYHHVVF0D3H82UNV9UM9JDENFPN5SMMK2359J5RKWVMKZ5ZVWAV4VJD63TM"
  "lnaddress@zbd.gg"
)

# Function to display the interactive menu
select_link() {
  echo "Please select a deep link to send to your emulator(s):"
  echo "1) Predefined Links"
  echo "2) Enter Custom Link"
  echo "3) Exit"

  read -p "Enter your choice [1-3]: " choice

  case $choice in
    1)
      select_predefined_link
      ;;
    2)
      enter_custom_link
      ;;
    3)
      echo "Exiting..."
      exit 0
      ;;
    *)
      echo "Invalid selection. Please try again."
      select_link
      ;;
  esac
}

# Function to display predefined links and handle selection
select_predefined_link() {
  echo "Select a predefined link:"
  local i=1
  for link in "${PREDEFINED_LINKS[@]}"; do
    echo "$i) $link"
    ((i++))
  done
  echo "$i) Back to Main Menu"

  read -p "#? " selection

  if [[ "$selection" -eq $i ]]; then
    select_link
    return
  elif [[ "$selection" -ge 1 && "$selection" -lt $i ]]; then
    selected_link="${PREDEFINED_LINKS[$((selection-1))]}"
    echo "You selected: $selected_link"
    send_link "$selected_link"
  else
    echo "Invalid selection. Please try again."
    select_predefined_link
  fi
}

# Function to prompt user to enter a custom link
enter_custom_link() {
  read -p "Enter your custom deep link: " CUSTOM_LINK
  if [[ -z "$CUSTOM_LINK" ]]; then
    echo "No link entered. Returning to main menu."
    select_link
  else
    echo "You entered: $CUSTOM_LINK"
    send_link "$CUSTOM_LINK"
  fi
}

# Function to detect running iOS Simulators and list their IDs and names
detect_ios_simulators() {
  if ! command -v xcrun &> /dev/null; then
    echo "xcrun not found. Ensure Xcode is installed and xcrun is in your PATH."
    return 1
  fi

  # Get list of booted simulators with name and ID
  local simctl_output
  simctl_output=$(xcrun simctl list devices booted | grep -E '^\s+[A-F0-9-]{36}\s+(.+)\s+\(Booted\)' | awk -F '[()]' '{print $2 ":" $1}')

  if [[ -z "$simctl_output" ]]; then
    echo "No running iOS simulators detected."
    return 1
  else
    IOS_SIMULATORS=()
    while IFS= read -r line; do
      IOS_SIMULATORS+=("$line")
    done <<< "$simctl_output"
    echo "${IOS_SIMULATORS[@]}"
    return 0
  fi
}

# Function to detect running Android Emulators and list their names
detect_android_emulators() {
  if ! command -v adb &> /dev/null; then
    echo "adb not found. Ensure Android SDK's platform-tools are installed and adb is in your PATH."
    return 1
  fi

  # Get list of connected devices that are emulators
  local emulators
  emulators=$(adb devices | grep emulator | awk '{print $1}')

  if [[ -z "$emulators" ]]; then
    echo "No running Android emulators detected."
    return 1
  else
    ANDROID_EMULATORS=()
    for emu in $emulators; do
      # Fetch emulator name using adb
      local emu_name
      emu_name=$(adb -s "$emu" shell getprop ro.product.model 2>/dev/null | tr -d '\r')
      if [[ -z "$emu_name" ]]; then
        emu_name="Emulator $emu"
      fi
      ANDROID_EMULATORS+=("$emu_name:$emu")
    done
    echo "${ANDROID_EMULATORS[@]}"
    return 0
  fi
}

# Function to send link to selected iOS Simulators
send_to_ios() {
  local link="$1"
  shift
  local simulators=("$@")
  
  for sim in "${simulators[@]}"; do
    local sim_name=$(echo "$sim" | cut -d':' -f1)
    local sim_id=$(echo "$sim" | cut -d':' -f2 | tr -d ' ')
    echo "Sending to iOS Simulator: $sim_name ($sim_id)"
    echo "Executing: xcrun simctl openurl \"$sim_id\" \"$link\""
    xcrun simctl openurl "$sim_id" "$link" &> /tmp/deeplink_dispatcher_ios.log
    if [[ $? -eq 0 ]]; then
      echo "Successfully sent to iOS Simulator: $sim_name ($sim_id)"
      echo "Log Output:"
      cat /tmp/deeplink_dispatcher_ios.log
    else
      echo "Failed to send to iOS Simulator: $sim_name ($sim_id)"
      echo "Log Output:"
      cat /tmp/deeplink_dispatcher_ios.log
    fi
  done
}

# Function to send link to selected Android Emulators
send_to_android() {
  local link="$1"
  shift
  local emulators=("$@")
  
  for emu in "${emulators[@]}"; do
    local emu_name=$(echo "$emu" | cut -d':' -f1)
    local emu_id=$(echo "$emu" | cut -d':' -f2)
    echo "Sending to Android Emulator: $emu_name ($emu_id)"
    adb -s "$emu_id" shell am start -a android.intent.action.VIEW -d "$link" &> /tmp/deeplink_dispatcher_android.log
    if [[ $? -eq 0 ]]; then
      echo "Successfully sent to Android Emulator: $emu_name ($emu_id)"
      echo "Log Output:"
      cat /tmp/deeplink_dispatcher_android.log
    else
      echo "Failed to send to Android Emulator: $emu_name ($emu_id)"
      echo "Log Output:"
      cat /tmp/deeplink_dispatcher_android.log
    fi
  done
}

# Function to prompt for platform selection and emulator selection
send_link() {
  local link="$1"
  
  echo "Where would you like to send the link?"
  echo "1) iOS Emulator(s)"
  echo "2) Android Emulator(s)"
  echo "3) Both iOS and Android Emulator(s)"
  echo "4) Cancel"

  read -p "Enter your choice [1-4]: " platform_choice

  case $platform_choice in
    1)
      handle_ios "$link"
      ;;
    2)
      handle_android "$link"
      ;;
    3)
      handle_ios "$link"
      handle_android "$link"
      ;;
    4)
      echo "Cancelled sending link."
      ;;
    *)
      echo "Invalid selection. Please try again."
      send_link "$link"
      ;;
  esac
}

# Function to handle sending link to iOS
handle_ios() {
  local link="$1"
  local ios_sims
  ios_sims=($(detect_ios_simulators))
  
  if [[ $? -eq 0 ]]; then
    local num_sims=${#ios_sims[@]}
    
    if [[ $num_sims -eq 1 ]]; then
      # Only one emulator running, send automatically
      echo "Only one iOS Simulator detected: ${ios_sims[0]}"
      send_to_ios "$link" "${ios_sims[0]}"
    else
      # Multiple emulators running, prompt user to select
      echo "Available iOS Simulators:"
      local i=1
      for sim in "${ios_sims[@]}"; do
        sim_name=$(echo "$sim" | cut -d':' -f1)
        sim_id=$(echo "$sim" | cut -d':' -f2)
        echo "$i) $sim_name ($sim_id)"
        ((i++))
      done
      echo "$i) Send to All"
      echo "$((i+1)) ) Cancel"

      read -p "#? " selection

      if [[ "$selection" -eq $i ]]; then
        send_to_ios "$link" "${ios_sims[@]}"
      elif [[ "$selection" -eq $((i+1)) ]]; then
        echo "Cancelled sending to iOS."
      elif [[ "$selection" -ge 1 && "$selection" -lt $i ]]; then
        selected_sim="${ios_sims[$((selection-1))]}"
        send_to_ios "$link" "$selected_sim"
      else
        echo "Invalid selection. Please try again."
        handle_ios "$link"
      fi
    fi
  fi
}

# Function to handle sending link to Android
handle_android() {
  local link="$1"
  local android_emus
  android_emus=($(detect_android_emulators))
  
  if [[ $? -eq 0 ]]; then
    local num_emus=${#android_emus[@]}
    
    if [[ $num_emus -eq 1 ]]; then
      # Only one emulator running, send automatically
      echo "Only one Android Emulator detected: ${android_emus[0]}"
      send_to_android "$link" "${android_emus[0]}"
    else
      # Multiple emulators running, prompt user to select
      echo "Available Android Emulators:"
      local i=1
      for emu in "${android_emus[@]}"; do
        emu_name=$(echo "$emu" | cut -d':' -f1)
        emu_id=$(echo "$emu" | cut -d':' -f2)
        echo "$i) $emu_name ($emu_id)"
        ((i++))
      done
      echo "$i) Send to All"
      echo "$((i+1)) ) Cancel"

      read -p "#? " selection

      if [[ "$selection" -eq $i ]]; then
        send_to_android "$link" "${android_emus[@]}"
      elif [[ "$selection" -eq $((i+1)) ]]; then
        echo "Cancelled sending to Android."
      elif [[ "$selection" -ge 1 && "$selection" -lt $i ]]; then
        selected_emu="${android_emus[$((selection-1))]}"
        send_to_android "$link" "$selected_emu"
      else
        echo "Invalid selection. Please try again."
        handle_android "$link"
      fi
    fi
  fi
}

select_link