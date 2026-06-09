# AGENTS.md

Guidance for AI agents working in this repository. See also `CLAUDE.md` for architecture and conventions.

## Cursor Cloud specific instructions

### Product overview

BlueWallet is a React Native Bitcoin & Lightning wallet. There is no local backend — the app talks to public Electrum servers and optional remote services (fiat APIs, LNDHub, Arkade) over the network.

### What runs on Linux (this VM)

| Task | Command | Notes |
|------|---------|-------|
| Install deps | `npm ci` | Runs `postinstall` (release notes, branch JSON, `patch-package`) |
| Lint | `npm run lint` | TypeScript + ESLint + unused loc keys |
| Unit tests | `npm run unit` | No emulator needed; some tests skip without mnemonic env vars |
| Integration tests | `npm run integration` | Needs outbound network; many tests skip without `HD_MNEMONIC*` secrets |
| Metro (dev server) | `npm start` | Port **8081**; verify with `curl http://localhost:8081/status` |
| Android debug build | `cd android && ./gradlew assembleDebug` | APK at `android/app/build/outputs/apk/debug/app-debug.apk` |
| Run on Android | `npm run android` | Requires emulator/device + Metro |

### Android toolchain (not in update script)

First-time setup on a fresh VM requires **Java 17** and the **Android SDK** (platform 36, build-tools 36.0.0, NDK 28.2.13676358). Set:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

Use `tests/e2e/detox-prepare-android-emu.sh` to create the `Pixel_API_29_AOSP` AVD (API 36, x86_64 on Linux).

### Emulator caveat (KVM)

The x86_64 Android emulator **requires `/dev/kvm`**. Without KVM, `emulator` exits with: `x86_64 emulation currently requires hardware acceleration`. ARM system images cannot run on x86_64 hosts either. In KVM-less VMs you can still **build** the APK and run **Metro**, but not launch the emulator. Use a physical device, a KVM-enabled runner, or macOS for iOS.

### iOS / macOS

iOS builds and the iOS Simulator require **macOS + Xcode + CocoaPods** (`npx pod-install`). Not available on Linux.

### Integration / E2E secrets

CI uses GitHub secrets for wallet mnemonics (`HD_MNEMONIC`, `HD_MNEMONIC_BIP84`, `BIP47_HD_MNEMONIC`, etc.). Without them, related tests log `skipped` and exit cleanly — this is expected locally.

### Standard commands

See `CLAUDE.md` and `README.md` for the canonical command list (`npm test`, `npm run lint:fix`, Detox E2E, clean targets).
